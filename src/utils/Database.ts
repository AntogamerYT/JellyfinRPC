import sqlite3 from 'sqlite3'

export class Database {
    public static async fetchFirst(db: sqlite3.Database, sql: string, params: any[] = []): Promise<any> {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(row)
                }
            })
        })
    }

    public static async fetchAll(db: sqlite3.Database, sql: string, params: any[] = []): Promise<any[]> {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(rows)
                }
            })
        })
    }
}