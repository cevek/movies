import * as React from 'react';
import {IMovies} from '../db-models/Movies';
import FastPromise from 'fast-promise';
import {RouteProps} from 'router';

export interface MovieProps extends RouteProps {
    movie: IMovies;
    params: {
        id: number;
    };
}

export class Movie extends React.Component<MovieProps, {}> {
    static onEnter(props: MovieProps) {
        return FastPromise.resolve(fetch(`/api/movie/${props.params.id}`).then<IMovies>(response => response.json()).then(movie => {
            props.movie = movie;
        }));
    }

    render() {
        const {movie} = this.props;
        return (
            <div className="movie">
                <h1>{movie.title}</h1>
            </div>
        );
    }
}