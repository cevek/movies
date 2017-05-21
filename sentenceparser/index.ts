import {makeSpeechPartType, Type} from './Type';

var pos = require('pos');
var tagger = new pos.Tagger();

function replaceShorts(s: string) {
    return s.replace(/\b(\w+?)[’'](\w+?)\b/g, (_, a, b) => {
        switch (b.toLowerCase()) {
            case 'd':
                return a + ' had';
            case 've':
                return a + ' have';
            case 'nt':
                return a + ' not';
            case 'm':
                return a + ' am';
            case 're':
                return a + ' are';
            case 's':
                if (/^(what|which|its?|he|she)$/i.test(a)) {
                    return a + ' is';
                }
                break;
            case 'll':
                return a + ' will';
            case 't':
                return (a === 'can' ? 'can' : a.substr(0, a.length - 1)) + ' not';
        }
        return _;
    });
}

function parseSentence(text: string) {
    var words = new pos.Lexer().lex(replaceShorts(text));
    var taggedWords = tagger.tag(words);
    const wordStream: Word[] = [];
    for (let i = 0; i < taggedWords.length; i++) {
        const [word, tag] = taggedWords[i];
        const w = {word, mergedWithNext: false, nextWord: null!, tag, speechPart: makeSpeechPartType(word, tag)};
        if (i > 0) {
            wordStream[wordStream.length - 1].nextWord = w;
        }
        wordStream.push(w);
    }
    return wordStream;
}


interface Word {
    mergedWithNext: boolean;
    nextWord: Word;
    word: string;
    speechPart: Type;
    tag: string;
}

// DT NN
// MD VB
// DT JJ
// JJ NN


const s0 = 'This is some sample text. This text can contain multiple sentences.';

const s1 = `
This night I can't sleep. 
I am thinking about my bad sister and silly Bill. 
I am thinking about that pour giraffe, too. 
Giraffes must live in the grasslands. 
They are tall, big and strong, and they must walk free! 
They must have a lot of trees around. 
They love eating fresh leaves.
And if people want to look at them, they can watch a film or go on a safari. 
It is very wrong to catch giraffes and put them in cages or houses. 
Then I am not thinking anymore.
I am sleeping.
`;
const words = parseSentence(s1);

for (let i = 0; i < words.length - 1; i++) {
    const word = words[i];
    const nword = word.word.toLowerCase();
    const nnextword = word.nextWord.word.toLowerCase();
    if (word.speechPart === Type.Determiner) {
        word.mergedWithNext = true;
    }
    if (word.speechPart === Type.Modal) {
        word.mergedWithNext = true;
    }

    if (word.speechPart === Type.Modal || word.speechPart === Type.Verb) {
        if (word.nextWord.speechPart === Type.Not) {
            word.mergedWithNext = true;
            word.nextWord.speechPart = word.speechPart;
        }
    }

    if (word.speechPart === Type.Adjective && word.nextWord.speechPart === Type.Noun) {
        word.mergedWithNext = true;
    }

    if (word.speechPart === Type.Noun && word.nextWord.speechPart === Type.Modal) {
        word.mergedWithNext = true;
    }

    if (word.speechPart === Type.Noun && word.nextWord.speechPart === Type.Verb) {
        word.mergedWithNext = true;
    }
    if (word.speechPart === Type.Noun && word.nextWord.speechPart === Type.Adjective) {
        word.mergedWithNext = true;
    }
    if (word.speechPart === Type.Verb && word.nextWord.speechPart === Type.VerbIng) {
        word.mergedWithNext = true;
    }
    // if (word.speechPart === Type.Verb && word.nextWord.speechPart === Type.Preposition) {
        // word.mergedWithNext = true;
    // }
    if (word.speechPart === Type.Verb && word.nextWord.speechPart === Type.Noun) {
        word.mergedWithNext = true;
    }
    if (word.speechPart === Type.Verb && word.nextWord.speechPart === Type.To) {
        word.mergedWithNext = true;
    }
    if (word.speechPart === Type.Verb && word.nextWord.speechPart === Type.Adjective) {
        word.mergedWithNext = true;
    }
    if (word.speechPart === Type.Adverb) {
        word.mergedWithNext = true;
    }
    if (word.speechPart === Type.Preposition) {
        word.mergedWithNext = true;
    }
    if (word.speechPart === Type.To) {
        word.mergedWithNext = true;
    }
    if (word.speechPart === Type.Conjuction && word.nextWord.speechPart === Type.Adjective) {
        word.mergedWithNext = true;
    }
    if (nword === 'very') {
        word.mergedWithNext = true;
    }
    if (nword === 'lot' && nnextword === 'of') {
        word.mergedWithNext = true;
        word.nextWord.speechPart = Type.Adverb;
    }
}

console.log(words);

function print(words: Word[]) {
    let s = '';
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (word.speechPart !== Type.Symbol) {
            s += ' ';
        }
        s += word.word;
        if (word.mergedWithNext === false && word.nextWord && word.nextWord.speechPart !== Type.Symbol) {
            s += '     ';
        }
    }
    console.log(s.trim());
}

print(words);

