const lines = `- Miss?
- Ah!
Oh, God.
I'm so very sorry.
It's okay. I'm sorry. I didn't...
I didn't expect you to still be here.
You did not dismiss me.
Oh. I was supposed to do that?
I'm sorry, Gaurau, I didn't know.
It is my pleasure.
What can I do for you?
Nothing, I was just gonna warm some milk up, but you go, go home.
No, no, allow me, please. I insist.
I will bring it to you.
Oh, you don't have to. I'll wait.
If you will permit me,
might I suggest a touch of cinnamon?
It is a secret learned from my wife.
Well, please apologize to your wife for my keeping you here all night.
It is fine. She is in India.
Oh.
I will see her in one month.
I'm afraid if I apologize then, it will hardly make sense.
So you work here and you travel back and forth?
Yes. Every three months, when I have a break in work and can afford the plane fare.
Isn't that hard?
What, miss?
Just, you know, being married and spending all that time apart.
Time does not matter.
When we see each other, each time...
...it is very wonderful.
I'm a lucky man.`.split('\n');

import * as React from 'react';

export interface RepeatProps {
}


export class Phrases extends React.Component<RepeatProps, {}> {
    
    render() {
        const {} = this.props;
        return (
            <div className="phrases">
      
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