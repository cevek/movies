export interface Sub {
    start: number;
    dur: number;
    text: string;
}

function fetchWithCache(url: string) {
    var data = localStorage.getItem(url);
    if (data) {
        return Promise.resolve(data);
    }
    return fetch(url).then(response => response.text()).then((data) => {
        localStorage.setItem(url, data);
        return data;
    });
}

export function fetchYTSubs(videoId: string) {
    return fetchTrascript(videoId);
}

function fetchTrascript(videoId: string) {
    return fetchWithCache('https://www.youtube.com/api/timedtext?v=' + videoId + '&lang=en&name=CC').then<Sub[] | null>((data) => {
        if (data) {
            // console.log(data);
            var div = document.createElement('div');
            div.innerHTML = data;
            var trascript = [...div.childNodes[1].childNodes].map((n: HTMLElement) => ({
                start: +n.getAttribute('start')!,
                dur: +n.getAttribute('dur')!,
                text: n.textContent!.replace(/&#39;/g, "'"),
            }));
            return trascript;
        }
        return [];
    });
}