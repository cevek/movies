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
    UP = 38,
    DOWN = 40,
    LEFT = 37,
    RIGHT = 39,
    SPACE = 32
}

export class Movie extends React.Component<MovieProps, {}> {
    static onEnter(props: MovieProps) {
        return FastPromise.resolve(fetch(`/api/movie/${props.params.id}`).then<IMovies>(response => response.json()).then(movie => {
            props.movie = movie;
            if (movie.enSubs && movie.ruSubs) {
                let enSubs = parseSubs(movie.enSubs);
                enSubs = removeInAudiables(enSubs);
                const ruSubs = parseSubs(movie.ruSubs);
                splitNewLines(ruSubs);
                props.mergedSubs = mergeSubs(enSubs, ruSubs);
                // console.log(props);
            }
            else props.mergedSubs = [];
        }));
    }

    playerData = new PlayerData(this.props.movie.id + '');

    componentWillUnmount() {
        this.playerData.destroy();
    }

    makeFullScreen = () => {
        document.documentElement.webkitRequestFullscreen();
    };

    render() {
        const {movie, mergedSubs} = this.props;
        return (
            <div className="movie">
                <div onClick={this.makeFullScreen} className="movie__fullscreen">FullScreen</div>
                <h1>{movie.title}</h1>
                <Player movie={movie} playerData={this.playerData}/>
                <Subs mergedSubs={mergedSubs} playerData={this.playerData}/>
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
    state = PlayerState.STOPPED;

    constructor(private uniqueId: string) {}

    init(element: HTMLVideoElement) {
        this.element = element;
        this.currentTime = this.loadCurrentTime();
        this.element.currentTime = this.currentTime;
        this.element.addEventListener('play', this.onPlay);
        this.element.addEventListener('playing', this.onPlay);
        this.element.addEventListener('pause', this.onPause);
        this.element.addEventListener('seeking', this.updateCurrentTime);
        this.element.addEventListener('seeked', this.updateCurrentTime);
    }

    destroy() {
        this.element.removeEventListener('play', this.onPlay);
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
            this.saveCurrentTime();
        }
    };

    play() {
        this.element.play();
        this.state = PlayerState.PLAYING;
    }

    pause() {
        this.element.pause();
        this.state = PlayerState.STOPPED;
        this.saveCurrentTime();
    }

    loadCurrentTime() {
        try {
            const time = localStorage.getItem(this.uniqueId + '_time');
            if (time && Number.isFinite(+time)) {
                return +time;
            }
        } catch (e) {}
        return 0;
    }

    saveCurrentTime() {
        try {
            localStorage.setItem(this.uniqueId + '_time', this.currentTime + '');
        } catch (e) {
            console.error(e);
        }
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

export class Player extends React.Component<PlayerProps, {}> {
    componentDidMount() {
        this.props.playerData.init(this.refs.video as HTMLVideoElement);
    }

    render() {
        const {movie} = this.props;
        return (
            <div className="player">
                <video ref="video" className="player__video" src={movie.videoUrl}/>
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
}


@observer
export class Subs extends React.Component<SubsProps, {}> {
    @computed get selectedSubIdx() {
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
                return i;
            }
        }
        return -1;
    }

    componentDidMount() {
        document.addEventListener('keypress', this.onKeyPress);
        document.addEventListener('keydown', this.onKeyPress);
        this.makePages();
        this.forceUpdate();
        this.autoScrollPageDisposer = autorun(this.autoScrollPage);
    }


    componentWillUnmount() {
        document.removeEventListener('keypress', this.onKeyPress);
        document.removeEventListener('keydown', this.onKeyPress);
        this.autoScrollPageDisposer();
    }


    autoScrollPageDisposer: ()=>void;

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


    @computed get pageProgress() {
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
        const averagePageSize = window.innerHeight;
        const windowSize = 100;
        const windowHalfSize = windowSize / 2;
        const root = (this.refs.root as HTMLElement);
        const allHeight = document.body.scrollHeight;
        const splits: SubSplit[] = [];
        const subsNodes = root.querySelectorAll('.sub');
        for (let i = 0; i < subsNodes.length; i++) {
            const node = subsNodes[i];
            const rect = node.getBoundingClientRect();
            const startTime = +(node.getAttribute('data-start-time') || 0);
            const endTime = +(node.getAttribute('data-end-time') || 0);
            splits.push({time: startTime, pos: rect.top}, {time: endTime, pos: rect.bottom});
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
        console.log(splits);
        console.log(pages);
        this.pages = pages;
    }

    onKeyPress = (e: KeyboardEvent) => {
        const {mergedSubs, playerData} = this.props;
        const {currentTime} = playerData;
        let handled = false;
        switch (e.keyCode) {
            case Key.SPACE: {
                playerData.playPause();
                handled = true;
                break;
            }
            case Key.LEFT: {
                const pos = mergedSubs.findIndex(sub => sub.start > currentTime || (sub.start <= currentTime && sub.end >= currentTime));
                if (pos > 0) {
                    playerData.seek(mergedSubs[pos - 1].start);
                }
                handled = true;
                break;
            }
            case Key.RIGHT: {
                const pos = mergedSubs.findIndex(sub => sub.start > currentTime);
                if (pos < mergedSubs.length) {
                    playerData.seek(mergedSubs[pos].start);
                }
                handled = true;
                break;
            }
        }
        if (handled) {
            e.preventDefault();
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
        const {mergedSubs, playerData} = this.props;
        return (
            <div className="subs" ref="root">
                <div className="subs__wrapper">
                    {mergedSubs.map((sub, i) =>
                        <Sub key={i} top={this.getDistance(i)} sub={sub} playerData={playerData}
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
    playerData: PlayerData;
    selected: boolean;
    top: number;
}

@observer
export class Sub extends React.Component<SubProps, {}> {
    playSub = () => {
        const {sub, playerData} = this.props;
        playerData.seek(sub.start);
    };

    render() {
        const {sub, top, selected} = this.props;
        return (
            <div onClick={this.playSub} data-start-time={sub.start} data-end-time={sub.end} style={{marginTop: top}}
                 className={`sub ${selected ? 'sub--selected' : ''}`}>
                <div className="sub__en">{sub.enText}</div>
                <div className="sub__ru">{sub.ruText}</div>
            </div>
        );
    }
}