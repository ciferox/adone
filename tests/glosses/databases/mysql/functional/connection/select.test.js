import { createConnection, createServer } from "../../common";

describe("database", "mysql", "functional", "connection", "select", () => {
    let connection = null;

    before(async () => {
        connection = await createConnection();
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    context("1", () => {
        for (const method of ["query", "execute"]) {
            // eslint-disable-next-line
            specify(method, async () => {
                const [rows, fields] = await connection[method]("SELECT 1");
                expect(rows).to.be.deep.equal([{ 1: 1 }]);
                expect(fields[0].name).to.be.equal("1");
            });
        }
    });

    context("empty string", () => {
        for (const method of ["query", "execute"]) {
            // eslint-disable-next-line
            specify(method, async () => {
                const [rows] = await connection[method]('SELECT ""');
                expect(rows).to.be.deep.equal([{ "": "" }]);
            });
        }
    });

    context("json", () => {
        const face = "\uD83D\uDE02";

        before(async () => {
            await connection.query("CREATE TEMPORARY TABLE json_test (test JSON)");
            await connection.query("INSERT INTO json_test VALUES (?)", JSON.stringify(face));
        });

        for (const method of ["query", "execute"]) {
            // eslint-disable-next-line
            specify(method, async () => {
                const [rows] = await connection[method]("SELECT * FROM json_test");
                expect(rows).to.be.deep.equal([{ test: face }]);
            });
        }
    });

    context("negative", () => {
        for (const method of ["query", "execute"]) {
            // eslint-disable-next-line
            specify(method, async () => {
                const [rows] = await connection[method]("SELECT -1 v", []);
                expect(rows).to.be.deep.equal([{ v: -1 }]);
            });
        }
    });

    context("utf8", () => {
        for (const method of ["query", "execute"]) {
            // eslint-disable-next-line
            specify(method, async () => {
                const multibyteText = "本日は晴天なり";
                const [rows, fields] = await connection[method](`SELECT '${multibyteText}'`);
                expect(rows[0][multibyteText]).to.be.equal(multibyteText);
                expect(fields[0].name).to.be.equal(multibyteText);
            });
        }
    });
});
