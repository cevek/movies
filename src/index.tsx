import * as ReactDOM from 'react-dom';
import * as React from 'react';
import { App } from './App';
import {List} from './List';
import {Movie} from './Movie';
import {Router, BrowserHistory, Route, RouterView} from 'router';

export namespace routes {
    export const index = new Route('/', App);
    export const list = index.addIndex(List as any);
    export const movie = index.addChild('movie/:id', Movie as any);
}

const history = new BrowserHistory();
const router = new Router(routes.index, history);
router.init().then(() => {
    ReactDOM.render(<RouterView router={router}/>, document.getElementById('root'));
});

ReactDOM.render(<App/>, document.getElementById('root'));