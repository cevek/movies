export const enum Type {
    Conjuction = 'Conjuction',
    CardinalNumber = 'CardinalNumber',
    Determiner = 'Determiner',
    ExistentialThere = 'ExistentialThere',
    Preposition = 'Preposition',
    Adjective = 'Adjective',
    Modal = 'Modal',
    Noun = 'Noun',
    Predeterminer = 'Predeterminer',
    Adverb = 'Adverb',
    Particle = 'Particle',
    To = 'To',
    Not = 'Not',
    Verb = 'Verb',
    VerbIng = 'VerbIng',
    WhDeterminer = 'WhDeterminer',
    WhPronoun = 'WhPronoun',
    PossessiveWh = 'PossessiveWh',
    WhAdverb = 'WhAdverb',
    Other = 'Other',
    Symbol = 'Symbol'
}

const replace:{[name: string]: Type} = {
    'CC': Type.Conjuction,
    'CD': Type.CardinalNumber,
    'DT': Type.Determiner,
    'EX': Type.ExistentialThere,
    'FW': Type.Other,
    'IN': Type.Preposition,
    'JJ': Type.Adjective,
    'JJR': Type.Adjective,
    'JJS': Type.Adjective,
    'LS': Type.Other,
    'MD': Type.Modal,
    'NN': Type.Noun,
    'NNP': Type.Noun,
    'NNPS': Type.Noun,
    'NNS': Type.Noun,
    'POS': Type.Other,
    'PDT': Type.Predeterminer,
    'PP$': Type.Noun,
    'PRP': Type.Noun,
    'PRP$': Type.Noun,
    'RB': Type.Adverb,
    'RBR': Type.Adverb,
    'RBS': Type.Adverb,
    'RP': Type.Particle,
    'SYM': Type.Symbol,
    'TO': Type.To,
    'UH': Type.Other,
    'VB': Type.Verb,
    'VBD': Type.Verb,
    'VBG': Type.VerbIng,
    'VBN': Type.Verb,
    'VBP': Type.Verb,
    'VBZ': Type.Verb,
    'WDT': Type.WhDeterminer,
    'WP': Type.WhPronoun,
    'WP$': Type.PossessiveWh,
    'WRB': Type.WhAdverb,
    ',': Type.Symbol,
    '!': Type.Symbol,
    '?': Type.Symbol,
    '.': Type.Symbol,
    ':': Type.Symbol,
    '$': Type.Symbol,
    '#': Type.Symbol,
    '"': Type.Symbol,
    '(': Type.Symbol,
    ')': Type.Symbol
};

export function makeSpeechPartType(word: string, type: string) {
    if (word.toLocaleLowerCase() === 'not') {
        return Type.Not;
    }
    const v = replace[type];
    if (!v) {
        throw new Error(`No type for ${type}`);
    }
    return v;
}

`
CC Coord Conjuncn           and,but,or
CD Cardinal number          one,two
DT Determiner               the,some
EX Existential there        there
FW Foreign Word             mon dieu
IN Preposition              of,in,by
JJ Adjective                big
JJR Adj., comparative       bigger
JJS Adj., superlative       biggest
LS List item marker         1,One
MD Modal                    can,should
NN Noun, sing. or mass      dog
NNP Proper noun, sing.      Edinburgh
NNPS Proper noun, plural    Smiths
NNS Noun, plural            dogs
POS Possessive ending       Õs
PDT Predeterminer           all, both
PP$ Possessive pronoun      my,oneÕs
PRP Personal pronoun         I,you,she
RB Adverb                   quickly
RBR Adverb, comparative     faster
RBS Adverb, superlative     fastest
RP Particle                 up,off
SYM Symbol                  +,%,&
TO ÒtoÓ                     to
UH Interjection             oh, oops
VB verb, base form          eat
VBD verb, past tense        ate
VBG verb, gerund            eating
VBN verb, past part         eaten
VBP Verb, present           eat
VBZ Verb, present           eats
WDT Wh-determiner           which,that
WP Wh pronoun               who,what
WP$ Possessive-Wh           whose
WRB Wh-adverb               how,where
, Comma                     ,
. Sent-final punct          . ! ?
: Mid-sent punct.           : ; Ñ
$ Dollar sign               $
# Pound sign                #
" quote                     "
( Left paren                (
) Right paren               )
`;
