import * as React from 'react';
import {IMovies} from '../db-models/Movies';
import FastPromise from 'fast-promise';
import {parseSubs, Sub} from './SubParser';

export interface PhrasesProps {
    movie: IMovies;
    words: {word: string; count: number}[];
    wordStream: {word: string; sub: Sub}[];
    wordMap: WordMap;
    phrases: Phrase[];
    params: {
        id: string;
    }
}

interface Word {
    word: string;
    sub: Sub;
}

type WordMap = Map<string, number[]>;
export class Phrases extends React.Component<PhrasesProps, {}> {
    static onEnter(props: PhrasesProps) {
        return FastPromise.resolve(fetch(`/api/movie/${props.params.id}`).then<IMovies>(response => response.json()).then(movie => {
            props.movie = movie;
            const wordStream: {word: string; sub: Sub}[] = [];
            if (movie.enSubs) {
                const enSubs = parseSubs(movie.enSubs);
                for (let i = 0; i < enSubs.length; i++) {
                    const sub = enSubs[i];
                    wordStream.push(...splitWords(sub.text).map(word => ({word, sub})));
                }
                props.wordStream = wordStream;
                const wordMap: WordMap = new Map();

                for (let i = 0; i < wordStream.length; i++) {
                    const word = wordStream[i];
                    let normalizedWord = word.word.toLowerCase();
                    let positions = wordMap.get(normalizedWord);
                    if (positions === void 0) {
                        positions = [];
                        wordMap.set(normalizedWord, positions);
                    }
                    positions.push(i);
                }
                props.wordMap = wordMap;
                props.words = [];
                for (const [word, positions] of wordMap) {
                    props.words.push({word, count: positions.length});
                }
                props.words.sort((a, b) => a.count > b.count ? -1 : 1);
                props.phrases = findSamePhrases(wordStream, wordMap);
            }
        }));
    }

    render() {
        const {movie, wordMap, phrases, words, wordStream} = this.props;
        return (
            <div className="phrases">
                <pre>{phrases.map((phrase, i) => <div key={i}>=============================<div>{phrase.original.text}</div>{phrase.phrases.map(phrase => <div>-------------{'\n'}{phrase.text}</div>)}</div>)}</pre>
                {/*{words.map(({word, count}) =>*/}
                {/*<div key={word}>{word}:{count}</div>*/}
                {/*)}*/}
            </div>
        );
    }
}


function splitWords(s: string) {
    const words = s.split(/[^A-Za-z'\-]+/);
    const newWords = [];
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (word !== '' && word !== '-' && word !== 's') {
            newWords.push(word);
        }
    }
    return newWords;
}

interface Phrase {
    original: Sub;
    phrases: Sub[]
}

function findSamePhrases(wordStream: Word[], wordMap: WordMap) {
    const phrases: {sub: Sub, originalSub: Sub; start: number, originalStart: number; originalEnd: number; end: number}[] = [];
    for (let i = 0; i < wordStream.length; i++) {
        const word = wordStream[i];
        const positions = wordMap.get(word.word.toLowerCase());
        if (positions !== void 0 && positions.length > 1) {
            for (let j = 0; j < positions.length; j++) {
                const pos = positions[j];
                if (i !== pos) {
                    let nextWordCount = 1;
                    for (let k = 1; k < 100; k++) {
                        if (pos + k < wordStream.length && i + k < wordStream.length && wordStream[i + k].word === wordStream[pos + k].word) {
                            nextWordCount++;
                        } else {
                            break;
                        }
                    }
                    if (nextWordCount > 2) {
                        let isSubPartOtherPhrase = false;
                        for (let k = 0; k < phrases.length; k++) {
                            const {start, end, originalStart, originalEnd} = phrases[k];
                            if ((start <= pos && end >= pos + nextWordCount) || (originalStart <= pos && originalEnd >= pos + nextWordCount)) {
                                isSubPartOtherPhrase = true;
                                break;
                            }
                        }
                        if (isSubPartOtherPhrase === false) {
                            phrases.push({
                                originalSub: word.sub,
                                sub: wordStream[pos].sub,
                                start: pos,
                                originalStart: i,
                                originalEnd: i + nextWordCount,
                                end: pos + nextWordCount
                            });
                        }
                    }
                }
            }
            // i += maxPhraseLength;
        }

    }
    const usedOriginals = new Set<Sub>();
    const res: Phrase[] = [];
    let item:Maybe<Phrase> = void 0;
    for (let i = 0; i < phrases.length; i++) {
        const phrase = phrases[i];
        // let s = '';
        // for (let j = phrase.originalStart; j < phrase.originalEnd; j++) {
        //     // s += ' ' + wordStream[j].word;
        // }
        // // s += ' / ';
        // for (let j = phrase.start; j < phrase.end; j++) {
        //     // s += ' ' + wordStream[j].word;
        // }
        //
        if (usedOriginals.has(phrase.originalSub) === false) {
            usedOriginals.add(phrase.originalSub);
            item = {original: phrase.originalSub, phrases: []};
            res.push(item);
        }
        item!.phrases.push(phrase.sub);
    }
    res.sort((a, b) => a.phrases.length > b.phrases.length ? -1 : 1);
    return res;
}