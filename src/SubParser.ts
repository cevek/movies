export interface Sub {
    start: number;
    end: number;
    text: string;
}
export interface MergedSub {
    start: number;
    end: number;
    text: string;
    ruText: string;
    ruSubs: Sub[];
}
export function parseSubs(srt: string) {
    const re = /(?:\d+\s+)?(\d+):(\d+):(\d+)[.,](\d+) --> (\d+):(\d+):(\d+)[,.](\d+)\s+([\s\S]*?)(?=\r?\n\r?\n\d+|\s*$)/g;
    let result: Sub[] = [];
    let res;
    while (res = re.exec(srt)) {
        result.push({
            start: +res[1] * 3600 + +res[2] * 60 + +res[3] + +res[4] / 1000,
            end: +res[5] * 3600 + +res[6] * 60 + +res[7] + +res[8] / 1000,
            text: res[9],
        });
    }
    // console.log(result);
    return result;
}

function splitText(text: string) {
    let startPos = 0;
    let endPos = 0;
    const newItems = [];
    for (let j = 0; j < text.length; j++) {
        const code = text.charCodeAt(j);
        if (code === 46 || code === 13 || code === 10 || code === 8230) {
            endPos = j + 1;
            continue;
        }
        if ((code === 45 && j + 1 < text.length && text.charCodeAt(j + 1) === 32) || code === 8211 || code === 8212) {
            endPos = j;
            continue;
        }
        if (startPos + 2 < endPos) {
            newItems.push(text.substring(startPos, endPos).trim());
            startPos = endPos;
        }
    }
    if (startPos < text.length) {
        newItems.push(text.substring(startPos, text.length).trim());
    }
    return newItems;
}
export function splitNewLines(subs: Sub[]) {
    for (let i = 0; i < subs.length; i++) {
        const sub = subs[i];
        const items = splitText(sub.text);
        // const items = sub.text.split(/(\n|\.+|- |–|—)/);
        // console.log(sub.text, items);
        // for (let j = 0; j < items.length; j++) {
        //     const item = items[j].trim();
        //     if (item) {
        //         newItems.push(item);
        //     }
        // }
        if (items.length > 1) {
            const dur = (sub.end - sub.start) / items.length;
            const start = sub.start;
            subs.splice(i, 1);
            for (let j = 0; j < items.length; j++) {
                const item = items[j];
                subs.splice(i + j, 0, {start: start + dur * j, end: start + dur * (j + 1), text: item});
            }
            i += items.length - 1;
        }
    }
}

// -----1111----1111-----111-----1111111-
// ----111---111-111-11---11--1---11-11--

function middle(sub: Sub) {
    return sub.start + (sub.end - sub.start) / 2;
}

export function mergeSubs(en: Sub[], ru: Sub[], ruShift = 0) {
    let j = 0;
    const resultSub: MergedSub[] = en.map(sub => ({
        start: sub.start,
        end: sub.end,
        text: sub.text,
        ruText: '',
        ruSubs: []
    }));

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
            leftEnSub.ruText += ruSub.text + '\n';
            leftEnSub.ruSubs.push(ruSub);
        } else if (leftDiff > rightDiff && rightEnSub && ruSub.end + ruShift > rightEnSub.start - max) {
            rightEnSub.ruText += ruSub.text + '\n';
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