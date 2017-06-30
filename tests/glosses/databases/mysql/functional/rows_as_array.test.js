import { createConnection } from "../common";

describe("database", "mysql", "functional", "rows as array", () => {

    context("enabled", () => {
        let connection = null;

        before(async () => {
            connection = await createConnection({ rowsAsArray: true });
        });

        after(async () => {
            if (connection) {
                await connection.end();
            }
        });

        for (const method of ["query", "execute"]) {
            // eslint-disable-next-line
            it(`should select as an array ${method}`, async () => {
                const [rows] = await connection[method]("select 1+1 as a");
                expect(rows[0][0]).to.be.equal(2);
            });

            // eslint-disable-next-line
            it("forced to disable", async () => {
                const [rows] = await connection[method]({
                    sql: "select 1+2 as a",
                    rowsAsArray: false
                });
                expect(rows[0].a).to.be.equal(3);
            });
        }
    });

    context("disabled", () => {
        let connection = null;

        before(async () => {
            connection = await createConnection({ rowsAsArray: false });
        });

        after(async () => {
            if (connection) {
                await connection.end();
            }
        });

        for (const method of ["query", "execute"]) {
            // eslint-disable-next-line
            it(`should select as an array ${method}`, async () => {
                const [rows] = await connection[method]("select 1+1 as a");
                expect(rows[0].a).to.be.equal(2);
            });

            // eslint-disable-next-line
            it("forced to true", async () => {
                const [rows] = await connection[method]({
                    sql: "select 1+2 as a",
                    rowsAsArray: true
                });
                expect(rows[0][0]).to.be.equal(3);
            });
        }
    });
});
