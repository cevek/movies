
export interface Sub {
    start: number;
    end: number;
    text: string;
}
export class MergedSub {
    start: number;
    end: number;
    text: string;
    ruText = '';
    ruSubs: Sub[] = [];
}
export function parseSubs(srt: string) {
    const re = /(?:\d+\s+)?(\d+):(\d+):(\d+)[.,](\d+) --> (\d+):(\d+):(\d+)[,.](\d+)\s+([\s\S]*?)(?=\r?\n\r?\n\d+|\s*$)/g;
    let result: Sub[] = [];
    let res;
    while (res = re.exec(srt)) {
        result.push({
            start: +res[1] * 3600 + +res[2] * 60 + +res[3] + +res[4] / 1000,
            end: +res[5] * 3600 + +res[6] * 60 + +res[7] + +res[8] / 1000,
            text: res[9] + '\n',
        });
    }
    // console.log(result);
    return result;
}

const enum Symbols  {
    NEWLINE = 10,
    NEWRLINE = 13,
    EXCLAMATORY_MARK = 33,
    QUESTION_MARK = 63,
    DOT = 46,
    COMMA = 44,
    MULTIDOTS = 8230,
    SPACE = 32,
    HYPHEN = 45,
    SHORT_DASH = 8211,
    LONG_DASH = 8212,
}
function splitText(text: string) {
    let startPos = 0;
    let endPos = 0;
    const newItems = [];
    for (let j = 0; j < text.length; j++) {
        const code = text.charCodeAt(j);
        if (code === Symbols.DOT/* || code === Symbols.COMMA*/ || code === Symbols.EXCLAMATORY_MARK || code === Symbols.QUESTION_MARK || code === Symbols.NEWRLINE || code === Symbols.NEWLINE || code === Symbols.MULTIDOTS) {
            endPos = j + 1;
            continue;
        }
        if ((code === Symbols.HYPHEN && j + 1 < text.length && text.charCodeAt(j + 1) === Symbols.SPACE) || code === Symbols.SHORT_DASH || code === Symbols.LONG_DASH) {
            endPos = j;
            continue;
        }
        if (startPos + 2 < endPos) {
            newItems.push(text.substring(startPos, endPos));
            startPos = endPos;
        }
    }
    if (startPos < text.length) {
        newItems.push(text.substring(startPos, text.length));
    }
    return newItems;
}


function countVowels(s: string) {
    const r = /[уеыаоэяиюёeyuioa]/ig;
    let count = 0;
    while(r.test(s)) count++;
    return count;
}

export function splitNewLines(subs: Sub[]) {
    const newSubs:Sub[] = [];
    for (let i = 0; i < subs.length; i++) {
        const sub = subs[i];
        const items = splitText(sub.text);
        const vowelsCount = countVowels(sub.text);
        const timePerVowel = (sub.end - sub.start) / vowelsCount;
        if (items.length > 1) {
            let start = sub.start;
            for (let j = 0; j < items.length; j++) {
                const item = items[j];
                const dur = timePerVowel * countVowels(item);
                newSubs.push({start: start, end: start + dur, text: item});
                start += dur;
            }
        } else {
            newSubs.push(sub);
        }
    }
    return newSubs;
}

// -----1111----1111-----111-----1111111-
// ----111---111-111-11---11--1---11-11--

function middle(sub: Sub) {
    return sub.start + (sub.end - sub.start) / 2;
}


export function mergeSubs(en: Sub[], ru: Sub[], ruShift = 0) {
    let j = 0;
    const resultSub: MergedSub[] = en.map(sub => {
        const msub = new MergedSub();
        msub.start = sub.start;
        msub.end = sub.end;
        msub.text = sub.text;
        return msub;
    });

    const max = 2;

    let lastEnSubK = 0;
    let skipped = 0;
    for (let i = 0; i < ru.length; i++) {
        const ruSub = ru[i];
        const ruSubMid = middle(ruSub) + ruShift;

        let leftEnSub: Maybe<MergedSub> = null;
        let rightEnSub: Maybe<MergedSub> = null;


        for (let k = lastEnSubK; k < resultSub.length; k++) {
            const sub = resultSub[k];
            const subMid = middle(sub);
            if (subMid < ruSubMid) {
                leftEnSub = sub;
                lastEnSubK = k;
            } else {
                rightEnSub = sub;
                break;
            }
        }


        const leftDiff = leftEnSub ? Math.abs(ruSubMid - middle(leftEnSub)) : Infinity;
        const rightDiff = rightEnSub ? Math.abs(ruSubMid - middle(rightEnSub)) : Infinity;
        if (leftDiff < rightDiff && leftEnSub && leftEnSub.end + max > ruSub.start + ruShift) {
            leftEnSub.ruText += ruSub.text;
            leftEnSub.ruSubs.push(ruSub);
        } else if (leftDiff > rightDiff && rightEnSub && ruSub.end + ruShift > rightEnSub.start - max) {
            rightEnSub.ruText += ruSub.text;
            rightEnSub.ruSubs.push(ruSub);
        } else {
            // console.log(ruSub, leftEnSub, rightEnSub);
            skipped++;
        }
    }
    // console.log(resultSub);
    console.log(`Skipped count: ${skipped}`);
    return resultSub;
}

function sortSub(a: Sub, b: Sub) {
    return a.start < b.start ? -1 : 1;
}

function overlapPercent(en: Sub, ru: Sub, ruShift: number, spreadSec: number) {
    const start = Math.max(en.start - spreadSec, ru.start + ruShift);
    const end = Math.min(en.end + spreadSec, ru.end + ruShift);
    if (start >= end) return 0;
    return (end - start) / (ru.end - ru.start + spreadSec * 2) * 100 | 0;
}
export function removeInAudiables(subs: Sub[]) {
    const newSubs: Sub[] = [];
    for (let i = 0; i < subs.length; i++) {
        const sub = subs[i];
        sub.text = sub.text.replace(/[\-–—]?\s*\([A-ZА-Я\d\W]+\)/g, '').trim();
        sub.text = sub.text.replace(/[A-ZА-Я\d\W]{3,}:/g, '').trim();
        if (sub.text) {
            newSubs.push(sub);
        }
    }
    return newSubs;
}