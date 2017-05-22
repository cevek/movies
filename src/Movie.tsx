import * as React from 'react';
import {IMovies} from '../db-models/Movies';
import FastPromise from 'fast-promise';
import {RouteProps} from 'router';
import {MergedSub, mergeSubs, parseSubs, removeInAudiables, splitNewLines} from './SubParser';
import {observer} from 'mobx-react';
import {autorun, computed, observable} from 'mobx';
import Timer = NodeJS.Timer;

export interface MovieProps extends RouteProps {
    movie: IMovies;
    mergedSubs: MergedSub[];
    params: {
        id: number;
    };
}

const enum Key {
    ENTER = 13,
    UP = 38,
    DOWN = 40,
    LEFT = 37,
    RIGHT = 39,
    SPACE = 32,
    R = 82,
    E = 69,
    S = 83,

    V = 86,
    C = 67,
    X = 88,
    Z = 90,
}

function saveLocalStorage(key: string, value: {}) {
    try {
        return localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error(e);
    }
}

function readLocalStorage(key: string): {} | null {
    try {
        return JSON.parse(localStorage.getItem(key) || 'null');
    } catch (e) {
        console.error(e);
        return null;
    }
}


class MovieConfigSub {
    idx: number;
    @observable hero: Maybe<number> = null;
    @observable newScene = false;

    constructor(props: MovieConfigSub) {
        this.idx = props.idx || 0;
        this.hero = props.hero;
        this.newScene = props.newScene || false;
    }
}

class MovieConfig {
    @observable currentTime = 0;
    @observable ruShift = 0;
    @observable showSubs = true;
    @observable showRuSubs = true;
    @observable subs = observable.map<MovieConfigSub>();

    constructor(props: MovieConfig | null) {
        if (!props) props = {} as MovieConfig;
        this.currentTime = props.currentTime || 0;
        this.ruShift = props.ruShift || 0;
        this.showSubs = typeof props.showSubs === 'boolean' ? props.showSubs : true;
        this.showRuSubs = typeof props.showRuSubs === 'boolean' ? props.showRuSubs : true;
        for (const idx in props.subs) {
            this.subs.set(idx, new MovieConfigSub((props.subs as any)[idx]));
        }
    }
}

export class Movie extends React.Component<MovieProps, {}> {
    static onEnter(props: MovieProps) {
        return FastPromise.resolve(fetch(`/api/movie/${props.params.id}`).then<IMovies>(response => response.json()).then(movie => {
            props.movie = movie;
            if (movie.enSubs && movie.ruSubs) {
                props.mergedSubs = Movie.makeMergedSubs(movie, 0);
                // console.log(props);
            }
            else props.mergedSubs = [];
        }));
    }

    mergedSubs = this.props.mergedSubs;
    config = this.loadConfig();

    // ruShift = readLocalStorage(this.props.movie.id + '_rushift');

    static makeMergedSubs(movie: IMovies, ruShift: number) {
        let enSubs = parseSubs(movie.enSubs);
        enSubs = removeInAudiables(enSubs);
        let ruSubs = parseSubs(movie.ruSubs);
        ruSubs = splitNewLines(ruSubs);
        return mergeSubs(enSubs, ruSubs, ruShift);
    }

    componentDidMount() {
        document.addEventListener('keydown', this.onKeyPress);
    }


    componentWillUnmount() {
        this.playerData.destroy();
        document.removeEventListener('keydown', this.onKeyPress);
    }

    loadConfig() {
        const config = readLocalStorage(this.props.movie.id + '_config');
        const movieConfig = new MovieConfig(config as MovieConfig);
        autorun(() => {
            saveLocalStorage(this.props.movie.id + '_config', movieConfig);
        });
        return movieConfig;
    }


    onKeyPress = (e: KeyboardEvent) => {
        let handled = false;
        if (e.shiftKey) {
            switch (e.keyCode) {
                case Key.UP: {
                    this.config.ruShift -= .2;
                    handled = true;
                    break;
                }
                case Key.DOWN: {
                    this.config.ruShift += .2;
                    handled = true;
                    break;
                }
                case Key.ENTER: {
                    this.toogleFullScreen();
                    handled = true;
                    break;
                }
            }
        }

        if (handled) {
            this.mergedSubs = Movie.makeMergedSubs(this.props.movie, this.config.ruShift);
            e.preventDefault();
            this.forceUpdate();
        }
    };

    playerData = new PlayerData(this.config);

    toogleFullScreen = () => {
        if (document.webkitIsFullScreen) {
            document.webkitExitFullscreen();
        } else {
            document.documentElement.webkitRequestFullscreen();
        }
    };

    render() {
        const {movie} = this.props;
        return (
            <div className="movie">
                <div onClick={this.toogleFullScreen} className="movie__fullscreen">FullScreen</div>
                <h1>{movie.title}</h1>
                <Player movie={movie} playerData={this.playerData}/>
                <Subs movieConfig={this.config} mergedSubs={this.mergedSubs} playerData={this.playerData}/>
            </div>
        );
    }
}

const enum PlayerState {
    PLAYING,
    STOPPED,
}


class PlayerData {
    @observable currentTime = 0;
    element: HTMLVideoElement;
    @observable state = PlayerState.STOPPED;

    constructor(private movieConfig: MovieConfig) {}

    init(element: HTMLVideoElement) {
        this.element = element;
        this.currentTime = this.movieConfig.currentTime;
        this.element.currentTime = this.currentTime;
        // this.element.addEventListener('play', this.onPlay);
        this.element.addEventListener('playing', this.onPlay);
        this.element.addEventListener('pause', this.onPause);
        this.element.addEventListener('seeking', this.updateCurrentTime);
        this.element.addEventListener('seeked', this.updateCurrentTime);
    }

    destroy() {
        // this.element.removeEventListener('play', this.onPlay);
        this.element.removeEventListener('playing', this.onPlay);
        this.element.removeEventListener('pause', this.onPause);
        this.element.removeEventListener('seeking', this.updateCurrentTime);
        this.element.removeEventListener('seeked', this.updateCurrentTime);
    }

    private timer: Timer;

    private updateTimer = () => {
        clearTimeout(this.timer);
        this.timer = setTimeout(this.updateTimer, 20);
        this.updateCurrentTime();
    };

    private onPlay = () => {
        this.state = PlayerState.PLAYING;
        this.updateTimer();
    };

    private onPause = () => {
        clearTimeout(this.timer);
        this.state = PlayerState.STOPPED;
        this.updateCurrentTime();
    };

    private updateCurrentTime = () => {
        this.currentTime = this.element.currentTime;
        // save ~ every 2 sec
        if (Math.floor(Math.random() * 100) % 100 === 0) {
            this.movieConfig.currentTime = this.currentTime;
        }
    };

    play() {
        this.element.play();
        this.state = PlayerState.PLAYING;
    }

    pause() {
        this.element.pause();
        this.state = PlayerState.STOPPED;
        this.movieConfig.currentTime = this.currentTime;
    }


    playPause() {
        if (this.state === PlayerState.PLAYING) {
            this.pause();
        } else if (this.state === PlayerState.STOPPED) {
            this.play();
        }
    }

    seek(time: number) {
        this.element.currentTime = time;
    }
}


export interface PlayerProps {
    movie: IMovies;
    playerData: PlayerData;
}


@observer
export class Player extends React.Component<PlayerProps, {}> {
    componentDidMount() {
        this.props.playerData.init(this.refs.video as HTMLVideoElement);
    }

    render() {
        const {movie, playerData: {state}} = this.props;
        const isPaused = state === PlayerState.STOPPED;
        return (
            <div className={`player ${isPaused ? 'player--paused' : ''}`}>
                <video ref="video" className="player__video" src={movie.videoUrl}/>
                <div className="player__overlay"/>
            </div>
        );
    }
}


interface SubsPage {
    top: number;
    bottom: number;
    startTime: number;
    endTime: number;
}

interface SubSplit {
    pos: number;
    time: number;
}


export interface SubsProps {
    mergedSubs: MergedSub[];
    playerData: PlayerData;
    movieConfig: MovieConfig;
}


@observer
export class Subs extends React.Component<SubsProps, {}> {

    @computed
    get selectedSubIdx() {
        const {mergedSubs, playerData: {currentTime}} = this.props;
        for (let i = 0; i < mergedSubs.length; i++) {
            const sub = mergedSubs[i];
            if (sub.start <= currentTime && sub.end >= currentTime) {
                return i;
            }
        }
        return -1;
    }

    get currentPageIdx() {
        const {playerData: {currentTime}} = this.props;
        for (let i = 0; i < this.pages.length; i++) {
            const page = this.pages[i];
            if (page.startTime <= currentTime && currentTime < page.endTime) {
                // console.log('page', i);
                return i;
            }
        }
        return -1;
    }

    onResize = () => {
        this.makePages();
    };

    componentDidMount() {
        window.addEventListener('resize', this.onResize);
        document.addEventListener('keypress', this.onKeyPress);
        document.addEventListener('keydown', this.onKeyPress);
        this.makePages();
        this.forceUpdate();
        this.autoScrollPageDisposer = autorun(this.autoScrollPage);
    }


    componentWillUnmount() {
        window.removeEventListener('resize', this.onResize);
        document.removeEventListener('keypress', this.onKeyPress);
        document.removeEventListener('keydown', this.onKeyPress);
        this.autoScrollPageDisposer();
    }


    autoScrollPageDisposer: () => void;

    prevCurrentPageIdx: number;
    autoScrollPage = () => {
        const currentPageIdx = this.currentPageIdx;
        if (this.prevCurrentPageIdx !== currentPageIdx) {
            this.prevCurrentPageIdx = currentPageIdx;
            const page = this.pages[currentPageIdx];
            if (page) {
                window.scrollTo(0, page.top);
            }
        }
    };


    @computed
    get pageProgress() {
        const {playerData: {currentTime}} = this.props;
        const page = this.pages[this.currentPageIdx];
        if (!page) {
            return 0;
        }
        const pageDur = page.endTime - page.startTime;
        const currentTimeForCurrentPage = currentTime - page.startTime;
        return currentTimeForCurrentPage / pageDur;
    }


    pages: SubsPage[] = [];

    makePages() {
        const averagePageSize = window.innerHeight - 20;
        const windowSize = 100;
        const windowHalfSize = windowSize / 2;
        const root = (this.refs.root as HTMLElement);
        const allHeight = document.body.scrollHeight;
        const splits: SubSplit[] = [];
        const subsNodes = root.querySelectorAll('.sub');
        const scrollTop = document.body.scrollTop;
        for (let i = 0; i < subsNodes.length; i++) {
            const node = subsNodes[i];
            const rect = node.getBoundingClientRect();
            const startTime = +(node.getAttribute('data-start-time') || 0);
            const endTime = +(node.getAttribute('data-end-time') || 0);
            splits.push({time: startTime, pos: rect.top + scrollTop}, {time: endTime, pos: rect.bottom + scrollTop});
        }
        let pageBottom = 0;
        let endTime = 0;
        let lastSplitIdx = 0;
        const pages: SubsPage[] = [];
        while (pageBottom < allHeight) {
            let prevPageBottom = pageBottom;
            pageBottom += averagePageSize;
            let prevEndTime = endTime;
            endTime = -1;
            let leftSubSplit: Maybe<SubSplit> = null;
            let rightSubSplit: Maybe<SubSplit> = null;
            for (let i = lastSplitIdx; i < splits.length; i++) {
                const subSplit = splits[i];
                const {time, pos} = subSplit;
                if (pageBottom - windowHalfSize <= pos && pageBottom + windowHalfSize >= pos) {
                    pageBottom = pos | 0;
                    endTime = time;
                    lastSplitIdx = i;
                    break;
                }
                if (pageBottom >= pos) {
                    leftSubSplit = subSplit;
                }
                rightSubSplit = subSplit;
                if (pageBottom + windowHalfSize < pos) {
                    break;
                }
            }
            if (endTime === -1) {
                if (!leftSubSplit || !rightSubSplit) {
                    console.log(leftSubSplit, rightSubSplit);
                    throw new Error('something wrong');
                }
                const pxPerSec = (rightSubSplit.pos - leftSubSplit.pos) / (rightSubSplit.time - leftSubSplit.time);
                endTime = leftSubSplit.time + (pageBottom - leftSubSplit.pos) / pxPerSec;
            }
            pages.push({top: prevPageBottom, bottom: pageBottom, startTime: prevEndTime, endTime: endTime});
        }
        // console.log(splits);
        // console.log(pages);
        this.pages = pages;
    }

    @observable showRuSubs = true;
    @observable showSubs = true;

    getCurrentSubIdx() {
        let subIdx = this.selectedSubIdx;
        const maxTimeAfterLastSub = 2;
        if (subIdx === -1) {
            const {mergedSubs, playerData: {currentTime}} = this.props;
            for (let i = 0; i < mergedSubs.length; i++) {
                const sub = mergedSubs[i];
                if (sub.start <= currentTime && sub.end + maxTimeAfterLastSub >= currentTime) {
                    subIdx = i;
                    break;
                }
            }
        }
        return subIdx;
    }

    setHeroToCurrentSub(heroNum: number) {
        const {mergedSubs, playerData, movieConfig} = this.props;
        const idx = this.getCurrentSubIdx();
        if (idx > -1) {
            const configSub = movieConfig.subs.get(idx + '');
            if (configSub) {
                if (configSub.hero === heroNum) {
                    configSub.hero = null;
                } else {
                    configSub.hero = heroNum;
                }
            } else {
                movieConfig.subs.set(idx + '', new MovieConfigSub({idx, hero: heroNum, newScene: false}));
            }
            if (mergedSubs.length > idx + 1) {
                playerData.seek(mergedSubs[idx + 1].start);
            }
        }
    }

    setNewSceneBeforeCurrentSub() {
        const {mergedSubs, movieConfig} = this.props;
        const idx = this.getCurrentSubIdx();
        if (idx > -1) {
            const configSub = movieConfig.subs.get(idx + '');
            if (configSub) {
                configSub.newScene = !configSub.newScene;
            } else {
                movieConfig.subs.set(idx + '', new MovieConfigSub({idx, hero: null, newScene: true}));
            }
        }
    }

    onKeyPress = (e: KeyboardEvent) => {
        const {mergedSubs, playerData} = this.props;
        const {currentTime} = playerData;
        let handled = false;
        const noMetaKey = !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey;
        if (noMetaKey) {
            let handled = true;
            switch (e.keyCode) {
                case Key.SPACE:
                    playerData.playPause();
                    break;
                case Key.LEFT: {
                    const pos = mergedSubs.findIndex(sub => sub.start > currentTime || (sub.start <= currentTime && sub.end >= currentTime));
                    if (pos > 0) {
                        playerData.seek(mergedSubs[pos - 1].start);
                    }
                    break;
                }
                case Key.RIGHT: {
                    const pos = mergedSubs.findIndex(sub => sub.start > currentTime);
                    if (pos < mergedSubs.length) {
                        playerData.seek(mergedSubs[pos].start);
                    }
                    break;
                }
                case Key.R:
                    this.showRuSubs = !this.showRuSubs;
                    break;
                case Key.S:
                    this.showSubs = !this.showSubs;
                    break;

                case Key.ENTER:
                    this.setNewSceneBeforeCurrentSub();
                    break;
                case Key.Z:
                    this.setHeroToCurrentSub(1);
                    break;
                case Key.X:
                    this.setHeroToCurrentSub(2);
                    break;
                case Key.C:
                    this.setHeroToCurrentSub(3);
                    break;
                case Key.V:
                    this.setHeroToCurrentSub(4);
                    break;

                default:
                    handled = false;

            }
            if (handled) {
                e.preventDefault();
            }
        }
    };

    getDistance(idx: number) {
        const {mergedSubs} = this.props;
        if (idx <= 0) return 0;
        const sub = mergedSubs[idx];
        const prevSub = mergedSubs[idx - 1];
        const distance = Math.round((sub.start - prevSub.end) * 20 / 50) * 50;
        return distance;
    }

    render() {
        const {mergedSubs, playerData, movieConfig, playerData: {state}} = this.props;
        const isPaused = state === PlayerState.STOPPED;
        return (
            <div
                className={`subs ${this.showSubs ? '' : 'subs--hidden'} ${this.showRuSubs ? '' : 'subs--ru-hidden'} ${isPaused ? 'subs--paused' : ''}`}
                ref="root">
                <div className="subs__wrapper">
                    {mergedSubs.map((sub, i) =>
                        <Sub key={i}
                             subIdx={i}
                             movieConfig={movieConfig}
                             top={this.getDistance(i)}
                             sub={sub}
                             playerData={playerData}
                             selected={this.selectedSubIdx === i}/>
                    )}
                </div>
                <div className="subs__page-progress">
                    <div className="subs__page-progress-indicator"
                         style={{transform: 'translateX(' + -(100 - this.pageProgress * 100) + '%)'}}/>
                </div>
            </div>
        );
    }

}


export interface SubProps {
    sub: MergedSub;
    subIdx: number;
    playerData: PlayerData;
    selected: boolean;
    top: number;
    movieConfig: MovieConfig;
}

@observer
export class Sub extends React.Component<SubProps, {}> {
    playSub = () => {
        const {sub, playerData} = this.props;
        playerData.seek(sub.start);
    };

    render() {
        const {sub, top, selected, movieConfig, subIdx} = this.props;
        const configSub = movieConfig.subs.get(subIdx + '');
        const heroClass = (configSub && typeof configSub.hero === 'number') ? `sub--hero sub--hero${configSub.hero}` : '';
        const newSceneClass = (configSub && configSub.newScene) ? `sub--new-scene` : '';
        return (
            <div onClick={this.playSub} data-start-time={sub.start} data-end-time={sub.end} style={{marginTop: top}}
                 className={`sub ${selected ? 'sub--selected' : ''} ${heroClass} ${newSceneClass}`}>
                <div className="sub__en">{sub.text}</div>
                <div className="sub__ru">{sub.ruText}</div>
            </div>
        );
    }
}