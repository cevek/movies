import * as Koa from 'koa';
import {createPackerInstance} from './packer.config';
import * as Router from 'koa-router';
import {query} from '../db';
import {IMovies} from '../db-models/Movies';
import {readFileSync} from 'fs';
import {exec, ExecOptions} from 'child_process';

const serve = require('koa-static');
const port = 5000;
const app = new Koa();
app.listen(port);
const packer = createPackerInstance();
const router = new Router();

async function execute(command: string, options?: ExecOptions) {
    return new Promise<{stdout: string, stderr: string}>((resolve, reject) => {
        exec(command, options!, (err: Error, stdout: string, stderr: string) => {
            if (err) return reject(err);
            resolve({stdout, stderr});
        });
    });
}
router.get('/api/movies/', async ctx => {
    ctx.body = await query<IMovies[]>('SELECT id, title, coverUrl FROM movies WHERE enSubs IS NOT NULL AND ruSubs IS NOT NULL');
});

router.get('/api/movie/:id/', async ctx => {
    ctx.body = (await query<IMovies[]>('SELECT * FROM movies WHERE id=?', [ctx.params.id]))[0];
});

router.get('/api/parse/', async ctx => {
    const query = ctx.query.text;
    const {stdout} = await execute(`PYTHONPATH="$PYTHONPATH:/usr/local/lib/python2.7/site-packages" python ${__dirname}/../sentenceparser/parser.py ${JSON.stringify(query)}`, {
        cwd: `${__dirname}/../sentenceparser/`
    });
    ctx.body = stdout;
});

packer.run({watch: true});
app.use(router.routes());
app.use(router.allowedMethods());

app.use(async (ctx, next) => {
    await next();
    if (ctx.status === 404) {
        ctx.body = readFileSync(packer.options.dest + '/index.html', 'utf-8');
        ctx.status = 200;
    }
});

app.use(serve(packer.options.dest));
