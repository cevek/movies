export interface Sub {
    start: number;
    end: number;
    text: string;
}
export interface MergedSub {
    start: number;
    end: number;
    enText: string;
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
    console.log(result);
    return result;
}

export function splitNewLines(subs: Sub[]) {
    for (let i = 0; i < subs.length; i++) {
        const sub = subs[i];
        const items = sub.text.split('\n');
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


export function mergeSubs(en: Sub[], ru: Sub[], ruShift = 0) {
    let j = 0;
    const resultSub: MergedSub[] = en.map(sub => ({
        start: sub.start,
        end: sub.end,
        enText: sub.text,
        ruText: '',
        ruSubs: []
    }));
    // console.log(resultSub);
    for (let k = 0; k < 2; k += .5) {
        let lastJ = 1;
        for (let i = 0; i < en.length; i++) {
            const enSub = en[i];
            j = lastJ;
            let ruSub = ru[j];
            while (ruSub && (ruSub.start + ruShift) < enSub.end + k) {
                if (overlapPercent(enSub, ruSub, ruShift, k) > 30) {
                    resultSub[i].ruSubs.push(ruSub);
                    ru.splice(j, 1);
                    j--;
                    lastJ = j;
                }
                if (enSub.start - ruSub.start > 10) {
                    lastJ = j;
                }
                j++;
                ruSub = ru[j];
            }
        }
    }
    for (let i = 0; i < resultSub.length; i++) {
        const sub = resultSub[i];
        sub.ruSubs.sort(sortSub);
        for (let k = 0; k < sub.ruSubs.length; k++) {
            const ruSub = sub.ruSubs[k];
            sub.ruText += (k > 0 ? '\n' : '') + ruSub.text;
        }
    }
    console.log(`Skipped count: ${ru.length}`);
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
    const newSubs:Sub[] = [];
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