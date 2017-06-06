import {readFileSync} from 'fs';

const mysql = require('mysql');

const config = JSON.parse(readFileSync(__dirname + '/config/' + (process.env.NODE_ENV || 'development') + '.json', 'utf8'));
const connection = mysql.createConnection(config);
connection.connect();

export function query<T>(sql: string, args?: (number | boolean | string | Date | null)[]) {
    return new Promise<T>((resolve, reject) => {
        connection.query(sql, args, (error: any, results: T) => {
            if (error) return reject(error);
            return resolve(results);
        });
    });
}

