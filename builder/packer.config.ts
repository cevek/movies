import {combineJS, Packer} from 'webbuilder';
import {ts} from 'webbuilder/dist/plugins/ts';
import {html} from 'webbuilder/dist/plugins/html';

export function createPackerInstance() {
    const packerConfig = {
        dest: '../dist',
        context: __dirname + '/../src/',
        publicPath: '/',
        alias: {
            // react: '../../dist/FastReact',
            // 'react-dom': '../../dist/FastReact',
        }
    };
    return new Packer(packerConfig, promise => promise
        .then(ts({}))
        .then(combineJS('index.js', 'js/bundle.js'))
        .then(html({
            file: 'index.html',
            destFile: 'index.html',
            params: {}
        }))
    );
}

