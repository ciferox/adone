import { createConnection, createPool } from "../common";

describe("glosses", "databases", "mysql", "functional", "pool disconnect", () => {
    it("should disconnect pool connection from using their ids", async () => {
        const conn = createConnection({ multipleStatements: true, promise: false });
        const pool = createPool({ promise: false });
        pool.config.connectionLimit = 5;


        const tids = [];

        pool.on("connection", (conn) => {
            tids.push(conn.threadId);
        });

        let promises = [];
        const numSelectToPerform = 10;

        for (let i = 0; i < numSelectToPerform; i++) {
            promises.push(new Promise((resolve, reject) => {
                pool.query("select 1 as value", (err, rows) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    if (rows[0].value !== 1) {
                        reject(new Error(rows[0].value));
                    }
                    resolve();
                });
            }));
        }
        await Promise.all(promises);
        expect(tids).to.have.lengthOf(5);
        promises = [];
        for (let i = 0; i < tids.length; ++i) {
            const id = tids[i];
            promises.push(new Promise((resolve, reject) => {
                // sleep required to give mysql time to close connection,
                // and callback called after connection with id is really closed
                conn.query("kill ?; select sleep(0.05)", id, (err) => {
                    err ? reject(err) : resolve();
                });
            }));
        }
        await Promise.all(promises);
        pool.end();
        conn.end();
    });
});
