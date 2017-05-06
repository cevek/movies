import * as React from 'react';
import {IMovies} from '../db-models/Movies';
import FastPromise from 'fast-promise';
import {RouteProps} from 'router';
import {MergedSub, mergeSubs, parseSubs, removeInAudiables, splitNewLines} from './SubParser';

export interface MovieProps extends RouteProps {
    movie: IMovies;
    mergedSubs: MergedSub[];
    params: {
        id: number;
    };
}

export class Movie extends React.Component<MovieProps, {}> {
    static onEnter(props: MovieProps) {
        return FastPromise.resolve(fetch(`/api/movie/${props.params.id}`).then<IMovies>(response => response.json()).then(movie => {
            props.movie = movie;
            if (movie.enSubs && movie.ruSubs) {
                let enSubs = parseSubs(movie.enSubs);
                enSubs = removeInAudiables(enSubs);
                const ruSubs = parseSubs(movie.ruSubs);
                splitNewLines(ruSubs);
                props.mergedSubs = mergeSubs(enSubs, ruSubs);
                console.log(props);
            }
            else props.mergedSubs = [];
        }));
    }

    render() {
        const {movie, mergedSubs} = this.props;
        return (
            <div className="movie">
                <h1>{movie.title}</h1>
                {mergedSubs.map((sub, i) =>
                    <div key={i} className="movie__sub">
                        <div className="movie__sub_en">{sub.enText}</div>
                        <div className="movie__sub_ru">{sub.ruText}</div>
                    </div>
                )}
            </div>
        );
    }
}