import {observable} from 'mobx';
import * as React from 'react';
import {observer} from 'mobx-react';
import {Play, SoundLoader} from 'sound-utils';
import {timestamps2} from '../text/timestamps2';
import Timer = NodeJS.Timer;
import result from './result';

interface Word {
    original: string;
    normalized: string;
    start: number | null;
    end: number | null;
}

let wordStream: Word[] = result//timestamps2;//timestamps.map(([word, start, end]: [string, number, number]) => ({word, start, end}));
const nWordStream: Word[][] = [];
for (let i = 0; i < wordStream.length; i++) {
    const lastWord = nWordStream.length > 0 ? nWordStream[nWordStream.length - 1] : null;

    const word = wordStream[i];
    if (!lastWord) {
        nWordStream.push([word]);
        continue;
    }
    if (getDurBetweenWords(lastWord[lastWord.length - 1], word) > .1) {
        nWordStream.push([word]);
    } else {
        lastWord.push(word);
    }
}

function getDurBetweenWords(word: Word | null, word2: Word | null) {
    if (!word || !word2 || !word.end || !word2.start) return 0;
    return word2.start - word.end;
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

    play(pos: number) {
        const group = nWordStream[pos];
        if (group && this.player) {
            const startWord = group[0];
            const endWord = group[group.length - 1];
            if (startWord.start && endWord.end) {
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
                if (!word.start || !word.end) continue;
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
                                  style={{borderRightWidth: getDurBetweenWords(word, group[j + 1]) * 100}}
                                  className={`audiogame__word ${(currentSelectedWord.group === i && currentSelectedWord.word === j) ? 'audiogame__word--selected' : ''}`}>
                                {word.original}
                            </span>
                        )}
                    </div>
                )}

            </div>
        );
    }
}


interface ImmutableArray<T> {
    length: number;

    toString(): string;

    toLocaleString(): string;

    concat(...items: T[][]): T[];

    concat(...items: (T | T[])[]): T[];

    join(separator?: string): string;

    slice(start?: number, end?: number): T[];

    indexOf(searchElement: T, fromIndex?: number): number;

    lastIndexOf(searchElement: T, fromIndex?: number): number;

    every(callbackfn: (this: void, value: T, index: number, array: T[]) => boolean): boolean;

    every(callbackfn: (this: void, value: T, index: number, array: T[]) => boolean, thisArg: undefined): boolean;

    every<Z>(callbackfn: (this: Z, value: T, index: number, array: T[]) => boolean, thisArg: Z): boolean;

    some(callbackfn: (this: void, value: T, index: number, array: T[]) => boolean): boolean;

    some(callbackfn: (this: void, value: T, index: number, array: T[]) => boolean, thisArg: undefined): boolean;

    some<Z>(callbackfn: (this: Z, value: T, index: number, array: T[]) => boolean, thisArg: Z): boolean;

    forEach(callbackfn: (this: void, value: T, index: number, array: T[]) => void): void;

    forEach(callbackfn: (this: void, value: T, index: number, array: T[]) => void, thisArg: undefined): void;

    forEach<Z>(callbackfn: (this: Z, value: T, index: number, array: T[]) => void, thisArg: Z): void;

    map<U>(this: [T, T, T, T, T], callbackfn: (this: void, value: T, index: number, array: T[]) => U): [U, U, U, U, U];

    map<U>(this: [T, T, T, T, T], callbackfn: (this: void, value: T, index: number, array: T[]) => U, thisArg: undefined): [U, U, U, U, U];

    map<Z, U>(this: [T, T, T, T, T], callbackfn: (this: Z, value: T, index: number, array: T[]) => U, thisArg: Z): [U, U, U, U, U];

    map<U>(this: [T, T, T, T], callbackfn: (this: void, value: T, index: number, array: T[]) => U): [U, U, U, U];

    map<U>(this: [T, T, T, T], callbackfn: (this: void, value: T, index: number, array: T[]) => U, thisArg: undefined): [U, U, U, U];

    map<Z, U>(this: [T, T, T, T], callbackfn: (this: Z, value: T, index: number, array: T[]) => U, thisArg: Z): [U, U, U, U];

    map<U>(this: [T, T, T], callbackfn: (this: void, value: T, index: number, array: T[]) => U): [U, U, U];

    map<U>(this: [T, T, T], callbackfn: (this: void, value: T, index: number, array: T[]) => U, thisArg: undefined): [U, U, U];

    map<Z, U>(this: [T, T, T], callbackfn: (this: Z, value: T, index: number, array: T[]) => U, thisArg: Z): [U, U, U];

    map<U>(this: [T, T], callbackfn: (this: void, value: T, index: number, array: T[]) => U): [U, U];

    map<U>(this: [T, T], callbackfn: (this: void, value: T, index: number, array: T[]) => U, thisArg: undefined): [U, U];

    map<Z, U>(this: [T, T], callbackfn: (this: Z, value: T, index: number, array: T[]) => U, thisArg: Z): [U, U];

    map<U>(callbackfn: (this: void, value: T, index: number, array: T[]) => U): U[];

    map<U>(callbackfn: (this: void, value: T, index: number, array: T[]) => U, thisArg: undefined): U[];

    map<Z, U>(callbackfn: (this: Z, value: T, index: number, array: T[]) => U, thisArg: Z): U[];

    filter(callbackfn: (this: void, value: T, index: number, array: T[]) => any): T[];

    filter(callbackfn: (this: void, value: T, index: number, array: T[]) => any, thisArg: undefined): T[];

    filter<Z>(callbackfn: (this: Z, value: T, index: number, array: T[]) => any, thisArg: Z): T[];

    reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T, initialValue?: T): T;

    reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;

    reduceRight(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T, initialValue?: T): T;

    reduceRight<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;

    readonly [n: number]: T;
}

interface MutableArray<T> extends ImmutableArray<T> {
    push(...items: T[]): number;

    pop(): T | undefined;

    reverse(): T[];

    shift(): T | undefined;

    sort(compareFn?: (a: T, b: T) => number): this;

    splice(start: number, deleteCount?: number): T[];

    splice(start: number, deleteCount: number, ...items: T[]): T[];

    unshift(...items: T[]): number;
}

class Arr<T> {
    private list:T[];
    constructor(arr: T[]);
    constructor(size: number);
    constructor(arg?: T[] | number) {
        if (typeof arg === 'number') {
            this.list = new Array(arg);
        } else if (typeof arg === 'object' && arg !== null) {
            this.list = arg;
        } else {
            this.list = [];
        }
    }

    mutate() {

    }
    getList() {
        this.use();
        return this.list;
    }
    use() {
        return this.list;
    }

    set(pos: number, value: T) {
        this.mutate();
        (this.list as T[])[pos] = value;
    }


    // mutable methods
    push(...items: T[]) {
        this.mutate();
        return (this.list as T[]).push(...items);
    }

    pop() {
        this.mutate();
        return (this.list as T[]).pop();
    }

    reverse() {
        this.mutate();
        return (this.list as T[]).reverse();
    }

    shift() {
        this.mutate();
        return (this.list as T[]).shift();
    }

    sort(compareFn?: ((a: T, b: T) => number) | undefined) {
        this.mutate();
        return (this.list as T[]).sort(compareFn);
    }

    splice(start: number, deleteCount?: number | undefined): T[];
    splice(start: number, deleteCount: number, ...items: T[]): T[];
    splice(start: any, deleteCount?: any, ...rest: any[]) {
        this.mutate();
        return (this.list as T[]).splice(start, deleteCount, ...rest);
    }

    unshift(...items: T[]) {
        this.mutate();
        return (this.list as T[]).unshift(...items);
    }

    // immutable methods

    get firstElement() {
        this.use();
        return this.list.length > 0 ? this.list[0] : void 0;
    }

    get lastElement() {
        this.use();
        return this.list.length > 0 ? this.list[this.list.length - 1] : void 0;
    }

    get(pos: number) {
        this.use();
        return this.list[pos];
    }

    toString() {
        this.use();
        return this.list.toString();
    }

    toLocaleString() {
        this.use();
        return this.list.toLocaleString();
    }

    concat(...items: T[][]): T[];
    concat(...items: (T | T[])[]): T[];
    concat(...items: any[]) {
        this.use();
        return this.list.concat(...items);
    }

    join(separator?: string | undefined) {
        this.use();
        return this.list.join(separator);
    }

    slice(start?: number | undefined, end?: number | undefined) {
        this.use();
        return this.list.slice(start, end);
    }

    indexOf(searchElement: T, fromIndex?: number | undefined) {
        this.use();
        return this.list.indexOf(searchElement, fromIndex);
    }

    lastIndexOf(searchElement: T, fromIndex?: number | undefined) {
        this.use();
        return this.list.lastIndexOf(searchElement, fromIndex);
    }

    every(callbackfn: (this: void, value: T, index: number, array: T[]) => boolean): boolean;
    every(callbackfn: (this: void, value: T, index: number, array: T[]) => boolean, thisArg: undefined): boolean;
    every<Z>(callbackfn: (this: Z, value: T, index: number, array: T[]) => boolean, thisArg: Z): boolean;
    every(callbackfn: any, thisArg?: any) {
        this.use();
        return this.list.every(callbackfn, thisArg);
    }

    some(callbackfn: (this: void, value: T, index: number, array: T[]) => boolean): boolean;
    some(callbackfn: (this: void, value: T, index: number, array: T[]) => boolean, thisArg: undefined): boolean;
    some<Z>(callbackfn: (this: Z, value: T, index: number, array: T[]) => boolean, thisArg: Z): boolean;
    some(callbackfn: any, thisArg?: any) {
        this.use();
        return this.list.some(callbackfn, thisArg);
    }

    forEach(callbackfn: (this: void, value: T, index: number, array: T[]) => void): void;
    forEach(callbackfn: (this: void, value: T, index: number, array: T[]) => void, thisArg: undefined): void;
    forEach<Z>(callbackfn: (this: Z, value: T, index: number, array: T[]) => void, thisArg: Z): void;
    forEach(callbackfn: any, thisArg?: any) {
        this.use();
        return this.list.forEach(callbackfn, thisArg);
    }

    map<U>(this: [T, T, T, T, T], callbackfn: (this: void, value: T, index: number, array: T[]) => U): [U, U, U, U, U];
    map<U>(this: [T, T, T, T, T], callbackfn: (this: void, value: T, index: number, array: T[]) => U, thisArg: undefined): [U, U, U, U, U];
    map<Z, U>(this: [T, T, T, T, T], callbackfn: (this: Z, value: T, index: number, array: T[]) => U, thisArg: Z): [U, U, U, U, U];
    map<U>(this: [T, T, T, T], callbackfn: (this: void, value: T, index: number, array: T[]) => U): [U, U, U, U];
    map<U>(this: [T, T, T, T], callbackfn: (this: void, value: T, index: number, array: T[]) => U, thisArg: undefined): [U, U, U, U];
    map<Z, U>(this: [T, T, T, T], callbackfn: (this: Z, value: T, index: number, array: T[]) => U, thisArg: Z): [U, U, U, U];
    map<U>(this: [T, T, T], callbackfn: (this: void, value: T, index: number, array: T[]) => U): [U, U, U];
    map<U>(this: [T, T, T], callbackfn: (this: void, value: T, index: number, array: T[]) => U, thisArg: undefined): [U, U, U];
    map<Z, U>(this: [T, T, T], callbackfn: (this: Z, value: T, index: number, array: T[]) => U, thisArg: Z): [U, U, U];
    map<U>(this: [T, T], callbackfn: (this: void, value: T, index: number, array: T[]) => U): [U, U];
    map<U>(this: [T, T], callbackfn: (this: void, value: T, index: number, array: T[]) => U, thisArg: undefined): [U, U];
    map<Z, U>(this: [T, T], callbackfn: (this: Z, value: T, index: number, array: T[]) => U, thisArg: Z): [U, U];
    map<U>(callbackfn: (this: void, value: T, index: number, array: T[]) => U): U[];
    map<U>(callbackfn: (this: void, value: T, index: number, array: T[]) => U, thisArg: undefined): U[];
    map<Z, U>(callbackfn: (this: Z, value: T, index: number, array: T[]) => U, thisArg: Z): U[];
    map(callbackfn: any, thisArg?: any) {
        this.use();
        return this.list.map(callbackfn, thisArg);
    }

    filter(callbackfn: (this: void, value: T, index: number, array: T[]) => any): T[];
    filter(callbackfn: (this: void, value: T, index: number, array: T[]) => any, thisArg: undefined): T[];
    filter<Z>(callbackfn: (this: Z, value: T, index: number, array: T[]) => any, thisArg: Z): T[];
    filter(callbackfn: any, thisArg?: any) {
        this.use();
        return this.list.filter(callbackfn, thisArg);
    }

    reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T, initialValue?: T | undefined): T;
    reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
    reduce(callbackfn: any, initialValue?: any) {
        this.use();
        return this.list.reduce(callbackfn, initialValue);
    }

    reduceRight(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T, initialValue?: T | undefined): T;
    reduceRight<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
    reduceRight(callbackfn: any, initialValue?: any) {
        this.use();
        return this.list.reduceRight(callbackfn, initialValue);
    }

    getBy(key: string): T[] {
        this.use();
        return null!;
    }
    getUniqueBy(key: string):T {
        this.use();
        return null!;
    }
}




class HMap<K, V> {
    readonly map: ReadonlyMap<K, V>;
    constructor(iterable?: Iterable<[K, V]>) {
        this.map = new Map(iterable!);
    }
    set(key: K, value: V) {
        return (this.map as Map<K, V>).set(key, value);
    }
    delete(key: K) {
        return (this.map as Map<K, V>).delete(key);
    }
}

class ObservableArray<T> extends Array<T> {
    constructor() {
        if(0) super();
        const arr:any = [];
        arr.setPrototypeOf(new.target.prototype);
        return arr;
    }
}

const xd = new HMap();
xd.map

// const arr = new Arr<number>();
// const d = arr.map(x => x + 1);
// arr.filter(arr => arr.toFixed()).getBy('');




class Foo {

}
