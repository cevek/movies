import * as ReactDOM from 'react-dom';
import * as React from 'react';
import {App} from './App';
import {List} from './List';
import {Movie} from './Movie';
import {BrowserHistory, Route, Router, RouterView} from 'router';
import {Phrases} from './Phrases';
import {Game} from './Game';
import {AudioGame} from './AudioGame';
import {AudioGame2} from './AudioGame2';
import {SyncSubs} from './SyncSubs';

export namespace routes {
    export const index = new Route('/', App);
    export const list = index.addIndex(List as any);
    export const movie = index.addChild('movie/:id', Movie as any);
    export const syncSubs = index.addChild('sync/:id', SyncSubs as any);
    export const phrases = index.addChild('phrases/:id', Phrases as any);
    export const game = index.addChild('game', Game as any);
    export const audiogame = index.addChild('audiogame', AudioGame as any);
    export const audiogame2 = index.addChild('audiogame2', AudioGame2 as any);
}

const history = new BrowserHistory();
const router = new Router(routes.index, history);
router.init().then(() => {
    ReactDOM.render(<RouterView router={router}/>, document.getElementById('root'));
});

