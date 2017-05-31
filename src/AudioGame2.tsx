import {observable} from 'mobx';
import * as React from 'react';
import {observer} from 'mobx-react';
import {Play, SoundLoader} from 'sound-utils';
import result from './result';
import Timer = NodeJS.Timer;

interface Word {
    normalized: string;
    original: string;
    start: number | null;
    end: number | null;
}

let wordStream: Word[] = result;//timestamps.map(([word, start, end]: [string, number, number]) => ({word, start, end}));
const nWordStream: Word[] = [];
for (let i = 0; i < wordStream.length; i++) {

    // const lastWord = nWordStream.length > 0 ? nWordStream[nWordStream.length - 1] : null;

    const word = wordStream[i];
    nWordStream.push(word);
    // if (!lastWord) {
    //     nWordStream.push([word]);
    //     continue;
    // }
    // if (getDurBetweenWords(lastWord[lastWord.length - 1], word) > .1) {
    //     nWordStream.push([word]);
    // } else {
    //     lastWord.push(word);
    // }
}

function getDurBetweenWords(word: Word | null, word2: Word | null) {
    if (!word || !word2 || !word.end || !word2.start) return 0;
    return word2.start - word.end;
}

function countVowels(s: string) {
    const r = /[уеыаоэяиюёeyuioa]/ig;
    let count = 0;
    while (r.test(s)) count++;
    return count;
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

export class AudioGame2 extends React.Component<GameProps, {}> {
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
        soundLoader.fromUrl('/audio/io1.mp3').then(ab => {
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

    playLine(pos: number) {
        if (this.player) {
            const startWord = nWordStream[pos];
            const endWord = nWordStream[pos];
            this.play(startWord.start, endWord.end);
        }
    }

    play(startTime: number | null, endTime: number | null) {
        if (this.player) {
            if (startTime && endTime) {
                this.isPlaying = true;
                const playingTrx = ++this.playingTrx;
                this.update();
                this.player.play(startTime, endTime - startTime, false, () => {
                    if (this.playingTrx === playingTrx) {
                        this.isPlaying = false;
                    }
                });
            }
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
                    this.playLine(this.openedWords - 1);
                    break;
                case Key.SPACE:
                    if (this.openedWords === 0) {

                    } else {
                        // this.openedWords--;
                    }
                    break;
                case Key.RIGHT:
                    this.playLine(this.openedWords);
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
            return -1;
        }
        const currentTime = this.player.getCurrentTime();
        for (let i = 0; i < nWordStream.length; i++) {
            const word = nWordStream[i];
            if (!word.start || !word.end) continue;
            if (word.start <= currentTime && currentTime <= word.end) {
                return i;
            }
            if (word.start > currentTime) return -1;
        }
        return -1;
    }

    getDurationPerVowel(word: Word) {
        if (!word.start || !word.end) return null;
        const vowelsCount = countVowels(word.normalized);
        return (word.end - word.start) / vowelsCount;
    }

    getColorByKoef(koef: number | null) {
        if (!koef) return '';
        return '#' + ('0' + (koef * 955 | 0).toString(16)).substr(-2) + '0000';
    }

    playWord(word: Word) {
        this.play(word.start, word.end);
    }

    render() {
        const {} = this.props;
        const currentSelectedWord = this.currentSelectedWord;
        return (
            <div className="audiogame">
                {nWordStream.map((word, i) =>
                    <span key={i}
                          className={`audiogame__word ${(currentSelectedWord === i) ? 'audiogame__word--selected' : ''}`}
                          onClick={() => this.playWord(word)}
                          data-start={word.start}
                          data-end={word.end}
                          data-dur-per-vowel={this.getDurationPerVowel(word)}
                          style={{
                              borderRightWidth: getDurBetweenWords(word, nWordStream[i + 1]) * 100,
                              borderBottomColor: this.getColorByKoef(this.getDurationPerVowel(word))
                          }}>
                          {word.original}
                    </span>
                )}

            </div>
        );
    }
}
