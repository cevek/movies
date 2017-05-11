import * as Koa from 'koa';
import {createPackerInstance} from './packer.config';
import * as Router from 'koa-router';
import {query} from '../db';
import {IMovies} from '../db-models/Movies';
import {readFileSync} from 'fs';
const serve = require('koa-static');
const port = 5000;
const app = new Koa();
app.listen(port);
const packer = createPackerInstance();
const router = new Router();

router.get('/api/movies/', async ctx => {
    ctx.body = await query<IMovies[]>('SELECT id, title, coverUrl FROM movies WHERE enSubs IS NOT NULL AND ruSubs IS NOT NULL');
});

router.get('/api/movie/:id/', async ctx => {
    ctx.body = (await query<IMovies[]>('SELECT * FROM movies WHERE id=?', [ctx.params.id]))[0];
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
