import * as React from 'react';
import {IMovies} from '../db-models/Movies';
import FastPromise from 'fast-promise';
import {RouteProps} from 'router';
import {MergedSub, mergeSubs, parseSubs, removeInAudiables, splitNewLines} from './SubParser';
import {observer} from 'mobx-react';
import {computed, observable} from 'mobx';
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
                console.log(props);
            }
            else props.mergedSubs = [];
        }));
    }

    playerData = new PlayerData();

    componentWillUnmount() {
        this.playerData.destroy();
    }

    render() {
        const {movie, mergedSubs} = this.props;
        return (
            <div className="movie">
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

    init(element: HTMLVideoElement) {
        this.element = element;
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
    };


    private clearState() {
        clearTimeout(this.timer);
        this.currentTime = this.element.currentTime;
    }

    play() {
        this.element.play();
    }

    pause() {
        this.element.pause();
    }

    playPause() {
        if (this.state === PlayerState.PLAYING) {
            this.pause();
        }
        if (this.state === PlayerState.STOPPED) {
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
                <video ref="video" className="player__video" src={movie.videoUrl} poster={movie.posterUrl} controls/>
            </div>
        );
    }
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

    componentDidMount() {
        document.addEventListener('keypress', this.onKeyPress);
        document.addEventListener('keydown', this.onKeyPress);
    }

    componentWillUnmount() {
        document.removeEventListener('keypress', this.onKeyPress);
        document.removeEventListener('keydown', this.onKeyPress);
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

    render() {
        const {mergedSubs, playerData} = this.props;
        return (
            <div className="subs">
                {mergedSubs.map((sub, i) =>
                    <Sub key={i} sub={sub} playerData={playerData} selected={this.selectedSubIdx === i}/>
                )}
            </div>
        );
    }
}


export interface SubProps {
    sub: MergedSub;
    playerData: PlayerData;
    selected: boolean;
}

@observer
export class Sub extends React.Component<SubProps, {}> {
    playSub = () => {
        const {sub, playerData} = this.props;
        playerData.seek(sub.start);
    };

    render() {
        const {sub, selected} = this.props;
        return (
            <div onClick={this.playSub} className={`sub ${selected ? 'sub--selected' : ''}`}>
                <div className="sub__en">{sub.enText}</div>
                <div className="sub__ru">{sub.ruText}</div>
            </div>
        );
    }
}