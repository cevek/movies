declare var YT: any;
var resolve: () => void;
var reject;
export var YTReady = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
});
(window as any).onYouTubeIframeAPIReady = () => { console.log('yeah'); resolve() }

export function createPlayer(dom: string | HTMLElement, options: any) {
    return YTReady.then(() => {
        console.log('YT created');
        options.events = options.events || {};
        return new Promise((res, rej) => {
            options.events.onReady = () => res(player);
            var player = new YT.Player(dom, options);
        });
    });
}


import * as React from 'react';
type Sub = any;
interface PlayerProps {
    subtitles: Sub[];
    videoId: string;
}

export class Player extends React.Component<PlayerProps, {}>{
    player: any;
    playerState = 0;
    timeout: any;
    currentTime: number = 0;
    getCurrentState = () => {
        this.playerState = this.player.getPlayerState();
        this.currentTime = this.player.getCurrentTime();
        if (this.playerState === YT.PlayerState.PLAYING) {
            this.timeout = setTimeout(this.getCurrentState, 20);
        }

        this.selectedSub = this.props.subtitles.findIndex(sub => sub.start <= this.currentTime && sub.start + sub.dur > this.currentTime);
        this.forceUpdate();
    }

    componentDidMount() {
        createPlayer(this.refs.player as HTMLElement, {
            videoId: this.props.videoId,
            width: window.innerWidth,
            height: window.innerHeight,
            playerVars: {
                cc_load_policy: 0,
                enablejsapi: 1,
                iv_load_policy: 3,
                modestbranding: 1,
                rel: 0,
                // hl: 'ru',
                showinfo: 0,
                // controls: 0,
            },
            events: {
                onStateChange: () => {
                    this.getCurrentState();
                }
            }
        }).then(p => this.player = p, err => console.error(err));

        window.addEventListener('resize', () => {
            this.player.setSize(window.innerWidth, window.innerHeight);
        });

        document.addEventListener('keypress', (e) => {
            if (e.keyCode === 32) {
                e.preventDefault();
                if (this.playerState === 1) {
                    this.player.pauseVideo();
                } else {
                    this.player.playVideo();
                }
            }

        });
        document.addEventListener('keydown', (e) => {
            if (e.keyCode === 38) {
                e.preventDefault();
                if (this.selectedSub > 0) {
                    this.player.seekTo(this.props.subtitles[this.selectedSub - 1].start, true);
                    this.forceUpdate();
                }
            }
            if (e.keyCode === 40) {
                e.preventDefault();
                if (this.props.subtitles.length > this.selectedSub + 1) {
                    this.player.seekTo(this.props.subtitles[this.selectedSub + 1].start, true);
                    this.forceUpdate();
                }
            }
        });
    }

    // shouldComponentUpdate() {
    // return false;
    // }

    onSubClick = (sub: Sub) => {
        this.player.seekTo(sub.start, true);
    }

    selectedSub: number = -1;

    render() {
        var { subtitles } = this.props;
        return (
            <div>
                {/*<div className="time">{this.currentTime}</div>*/}
                <div className="video" ref="player"></div>
                <Subtitles selectedSub={subtitles[this.selectedSub]} onSubClick={this.onSubClick} subtitles={subtitles} />
            </div>
        );
    }
}



interface SubtitlesProps {
    subtitles: Sub[];
    selectedSub: Sub;
    onSubClick: (sub: Sub) => void;
}
class Subtitles extends React.Component<SubtitlesProps, {}> {
    render() {
        var { subtitles, selectedSub, onSubClick } = this.props;
        return (
            <div className="subtitles">
                {subtitles.map((sub, i) => <Subtitle key={i} selected={selectedSub === sub} onSubClick={onSubClick} sub={sub} />)}
            </div>
        );
    }
}



function Subtitle({ sub, selected, onSubClick }: { sub: Sub, selected: boolean, onSubClick: (sub: Sub) => void; }) {
    return (
        <div onClick={() => onSubClick(sub)} className={'sub ' + (selected ? 'selected' : '')}>
            {sub.text}
        </div>
    );
}

