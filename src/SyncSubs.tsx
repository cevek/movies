import * as React from 'react';
import {IMovies} from '../db-models/Movies';
import FastPromise from 'fast-promise';
import {parseSubs, Sub} from './SubParser';
import {observer} from 'mobx-react';
import {observable} from 'mobx';

export interface SyncSubsProps {
    movie: IMovies;
    enSubs: Sub[];
    ruSubs: Sub[];
    params: {id: string};
}


@observer
export class SyncSubs extends React.Component<SyncSubsProps, {}> {
    static onEnter(props: SyncSubsProps) {
        return FastPromise.resolve(fetch(`/api/movie/${props.params.id}`).then<IMovies>(response => response.json()).then(movie => {
            props.movie = movie;
            props.enSubs = parseSubs(movie.enSubs);
            props.ruSubs = parseSubs(movie.ruSubs);
        }));

    }

    @observable selectedEnSub1 = 0;
    @observable selectedEnSub2 = this.props.enSubs.length - 1;

    @observable selectedRuSub1 = 0;
    @observable selectedRuSub2 = this.props.ruSubs.length - 1;

    selectRuSub(event: React.MouseEvent<{}>, pos: number) {
        if (event.metaKey || event.ctrlKey) {
            if (pos > this.selectedRuSub1) {
                this.selectedRuSub2 = pos;
            }
        } else {
            if (pos < this.selectedRuSub2) {
                this.selectedRuSub1 = pos;
            }
        }
    }

    selectEnSub(event: React.MouseEvent<{}>, pos: number) {
        if (event.metaKey || event.ctrlKey) {
            if (pos > this.selectedEnSub1) {
                this.selectedEnSub2 = pos;
            }
        } else {
            if (pos < this.selectedEnSub2) {
                this.selectedEnSub1 = pos;
            }
        }
    }

    sync() {
        const {enSubs, ruSubs} = this.props;
        const enSub1 = enSubs[this.selectedEnSub1];
        const enSub2 = enSubs[this.selectedEnSub2];
        const ruSub1 = ruSubs[this.selectedRuSub1];
        const ruSub2 = ruSubs[this.selectedRuSub2];
        const shift = enSub1.start - ruSub1.start;
        const k = (enSub2.end - enSub1.start) / (ruSub2.end - ruSub1.start);
        for (let i = 0; i < this.selectedRuSub1; i++) {
            const ruSub = ruSubs[i];
            ruSub.start += shift;
            ruSub.end += shift;
        }
        for (let i = this.selectedRuSub1; i < ruSubs.length; i++) {
            const ruSub = ruSubs[i];
            ruSub.start = (ruSub.start - ruSub1.start) * k + ruSub1.start;
            ruSub.end = (ruSub.end - ruSub1.start) * k + ruSub1.start;
        }
        this.forceUpdate();
    }

    render() {
        const {movie, enSubs, ruSubs} = this.props;
        const k = 15;
        return (
            <div className="sync-subs">
                <button className="sync-subs__sync" onClick={() => this.sync()}>Sync</button>
                {enSubs.map((sub, i) =>
                    <div
                        className={`sync-subs__sub sync-subs__en-sub ${this.selectedEnSub1 === i ? 'sync-subs__selected-sub1' : ''} ${this.selectedEnSub2 === i ? 'sync-subs__selected-sub2' : ''}`}
                        key={i}
                        onClick={(e) => this.selectEnSub(e, i)}
                        style={{top: sub.start * k, height: (sub.end - sub.start) * k}}>
                        {sub.text}
                    </div>
                )}
                {ruSubs.map((sub, i) =>
                    <div
                        className={`sync-subs__sub sync-subs__ru-sub ${this.selectedRuSub1 === i ? 'sync-subs__selected-sub1' : ''} ${this.selectedRuSub2 === i ? 'sync-subs__selected-sub2' : ''}`}
                        onClick={(e) => this.selectRuSub(e, i)}
                        key={i}
                        style={{top: sub.start * k, height: (sub.end - sub.start) * k}}>
                        {sub.text}
                    </div>
                )}
                <textarea className="sync-subs__textarea" value={buildSrt(ruSubs)}/>
            </div>
        );
    }
}


function formatSrtTime(time: number) {
    return `${('0' + Math.floor(time / 3600)).substr(-2)}:${('0' + Math.floor(time / 60) % 60).substr(-2)}:${('0' + (time % 60).toFixed(3)).substr(-6)}`;
}

function buildSrt(subs: Sub[]) {
    let srt = '';
    for (let i = 0; i < subs.length; i++) {
        const sub = subs[i];
        srt += `${i + 1}\n${formatSrtTime(sub.start)} --> ${formatSrtTime(sub.end)}\n${sub.text}\n\n`;
    }
    return srt;
}