import {
    getAttr,
    getAttrOrNull,
    getNode,
    getNodeList,
    getNodeOrNull,
    getRegexpValue,
    getText
} from '../../parsers-lib/dom-helpers';
import {getHTML, getUrl, setCacheDir} from '../../parsers-lib/requester';
import {query} from '../db';
async function main() {
    await query('truncate table movies');
    for (let i = 1; i <= 100; i++) {
        if (await getPage('movies', i) === false) break;
    }
    for (let i = 1; i <= 100; i++) {
        if (await getPage('mults', i) === false) break;
    }
}

async function getPage(type: string, page: number) {
    const doc = await getHTML(`https://voriginale.tv/${type}/page${page}/`, {
        requestOptions: {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        }
    });
    if (getText(doc, '.preview__list') === 'Ничего не найдено') return false;
    const list = getNodeList(doc, '.preview__movie');
    for (let i = 0; i < list.length; i++) {
        const movieItem = list[i];
        const id = getRegexpValue(getAttr(getNode(movieItem, 'a.preview__link'), 'href'), /\/([^/]+)\/$/);
        await getMovie(id);
    }
    return true;
}

async function getMovie(extId: string) {
    const doc = await getHTML(`https://voriginale.tv/video/${extId}/`);
    const kpUrl = getAttrOrNull(getNodeOrNull(doc, '.movie__label'), 'data-kinopoiskUrl');
    const ruTitle = getText(doc, '.movie__h3');
    const title = getText(doc, '.movie__h4[itemprop]');
    const videoNode = getNode(doc, '#video-id');
    const posterUrl = getAttr(videoNode, 'poster');
    const coverUrl = getAttr(getNode(doc, '.movie__cover'), 'src');
    const videoUrl = getAttr(getNode(videoNode, 'source'), 'src');
    const enSubUrl = getAttrOrNull(getNodeOrNull(videoNode, 'track[srclang="en"]'), 'src');
    const ruSubUrl = getAttrOrNull(getNodeOrNull(videoNode, 'track[srclang="ru"]'), 'src');
    const enSubs = enSubUrl ? await getSub(enSubUrl) : null;
    const ruSubs = ruSubUrl ? await getSub(ruSubUrl) : null;
    await query('INSERT INTO movies (extId, title, ruTitle, posterUrl, coverUrl, kpUrl, videoUrl, enSubUrl, ruSubUrl, enSubs, ruSubs) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        [extId, title, ruTitle, posterUrl, coverUrl, kpUrl, videoUrl, enSubUrl, ruSubUrl, enSubs, ruSubs]
    );
}

async function getSub(url: string) {
    const srt = await getUrl(url);
    const sub = srt.replace(/<[^>]+>/g, '');
    return sub;
}


setCacheDir(__dirname + '/cache/');
main().catch(e => console.error(e.stack));
