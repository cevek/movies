import {observable} from 'mobx';
import * as React from 'react';
import {observer} from 'mobx-react';
import {timestamps} from '../text/timestamps';
import {Play, SoundLoader} from 'sound-utils';
import Timer = NodeJS.Timer;

interface Word {
    word: string;
    start: number;
    end: number;
}

let wordStream: Word[] = timestamps.map(([word, start, end]: [string, number, number]) => ({word, start, end}));
const nWordStream: Word[][] = [];
for (let i = 0; i < wordStream.length; i++) {
    const lastWord = nWordStream.length > 0 ? nWordStream[nWordStream.length - 1] : null;

    const word = wordStream[i];
    if (!lastWord) {
        nWordStream.push([word]);
        continue;
    }
    if (word.start - lastWord[lastWord.length - 1].end > .1) {
        nWordStream.push([word]);
    } else {
        lastWord.push(word);
    }
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


export interface GameProps {
}

export class AudioGame extends React.Component<GameProps, {}> {
    render() {
        return (
            <AudioGameInner/>
        );
    }
}

@observer
class AudioGameInner extends React.Component<GameProps, {}> {

    @observable audioLoaded = false;
    audioBuffer: AudioBuffer;

    player: Play;

    componentDidMount() {
        const audioContext = new AudioContext();
        const soundLoader = new SoundLoader(audioContext);
        soundLoader.fromUrl('/audio/audio1.mp3').then(ab => {
            this.audioBuffer = ab;
            this.audioLoaded = true;
            this.player = new Play(audioContext);
            this.player.setAudio(ab);
        });
        document.addEventListener('keypress', this.onKeyPress);
        document.addEventListener('keydown', this.onKeyPress);
    }


    componentWillUnmount() {
        document.removeEventListener('keypress', this.onKeyPress);
        document.removeEventListener('keydown', this.onKeyPress);
    }

    @observable openedWords = 0;
    timeout: Timer;

    isPlaying = false;
    playingTrx = 0;

    play(pos: number) {
        const group = nWordStream[pos];
        if (group && this.player) {
            const startWord = group[0];
            const endWord = group[group.length - 1];
            this.isPlaying = true;
            const playingTrx = ++this.playingTrx;
            this.update();
            this.player.play(startWord.start, endWord.end - startWord.start, false, () => {
                if (this.playingTrx === playingTrx) {
                    this.isPlaying = false;
                }
            });
        }
    }

    update = () => {
        if (this.isPlaying) {
            this.forceUpdate();
            setTimeout(this.update, 20);
        }
    };


    onKeyPress = (e: KeyboardEvent) => {
        const {} = this.props;
        const noMetaKey = !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey;
        if (noMetaKey) {
            let handled = true;
            switch (e.keyCode) {
                case Key.LEFT:
                    if (this.openedWords === 0) {

                    } else {
                        // this.openedWords--;
                    }
                    this.play(this.openedWords - 1);
                    break;
                case Key.RIGHT:
                    this.play(this.openedWords);
                    if (this.openedWords === wordStream.length) {

                    } else {
                        this.openedWords++;
                    }
                    window.scrollTo(0, 99999999);
                    break;
                case Key.ENTER:
                    break;
                default:
                    handled = false;

            }
            if (handled) {
                e.preventDefault();
            }
        }
    };

    get currentSelectedWord() {
        if (!this.player) {
            return {group: -1, word: -1};
        }
        const currentTime = this.player.getCurrentTime();
        for (let i = 0; i < nWordStream.length; i++) {
            const group = nWordStream[i];
            for (let j = 0; j < group.length; j++) {
                const word = group[j];
                if (word.start <= currentTime && currentTime <= word.end) {
                    return {group: i, word: j};
                }
                if (word.start > currentTime) return {group: -1, word: -1};
            }
        }
        return {group: -1, word: -1};
    }

    render() {
        const {} = this.props;
        const currentSelectedWord = this.currentSelectedWord;
        return (
            <div className="audiogame">
                {nWordStream.slice(0, this.openedWords).map((group, i) =>
                    <div key={i} className="audiogame__group">
                        {group.map((word, j) =>
                            <span key={j}
                                  data-start={word.start}
                                  data-end={word.end}
                                  style={{borderRightWidth: group[j + 1] ? (group[j + 1].start - word.end) * 100 : 0}}
                                  className={`audiogame__word ${(currentSelectedWord.group === i && currentSelectedWord.word === j) ? 'audiogame__word--selected' : ''}`}>
                                {word.word}
                            </span>
                        )}
                    </div>
                )}

            </div>
        );
    }
}