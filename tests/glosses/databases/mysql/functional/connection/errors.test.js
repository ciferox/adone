import { createConnection } from "../../common";

describe("database", "mysql", "functional", "connection", "errors", () => {
    const { identity, noop } = adone;

    let connection = null;
    let connection1 = null;

    before(async () => {
        connection = await createConnection();
        connection1 = createConnection({ promise: false });
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
        if (connection1) {
            connection1.end();
        }
    });

    for (const method of ["execute", "query"]) {
        // eslint-disable-next-line
        it(`should throw parse error using ${method}`, async () => {
            const e = await connection[method]("error in execute", []).then(noop, identity);
            expect(e.errno).to.be.equal(1064);
            expect(e.code).to.be.equal("ER_PARSE_ERROR");
        });
    }

    for (const method of ["execute", "query"]) {
        // eslint-disable-next-line
        it(`should not fire an error event using ${method}`, (done) => {
            connection1[method]("error in execute", [], (e) => {
                expect(e.errno).to.be.equal(1064);
                expect(e.code).to.be.equal("ER_PARSE_ERROR");
                done();
            }).once("error", () => {
                done(new Error("shouldnt be fired"));
            });
        });
    }
});
