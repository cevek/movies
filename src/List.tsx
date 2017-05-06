import * as React from 'react';
import {IMovies} from '../db-models/Movies';
import FastPromise from 'fast-promise';
import {routes} from './index';
import {Link} from 'router';

export interface ListProps {
    movies: IMovies[];
}

export class List extends React.Component<ListProps, {}> {
    static onEnter(props: ListProps) {
        return FastPromise.resolve(fetch('/api/movies/').then<IMovies[]>(response => response.json()).then(movies => {
            props.movies = movies;
        }));
    }

    render() {
        const {movies} = this.props;
        return (
            <div className="list">
                {movies.slice(0, 10).map(movie =>
                    <Link key={movie.id} className="list__movie" url={routes.movie.toUrl({id: movie.id})}>
                        <img className="list__cover" src={movie.coverUrl} alt=""/>
                        <div className="list__title">{movie.title}</div>
                    </Link>
                )}
            </div>
        );
    }
}