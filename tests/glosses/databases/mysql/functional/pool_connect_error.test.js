import { createConnection, createPool } from "../common";

describe("glosses", "databases", "mysql", "functional", "pool connect error", () => {
    const { database: { mysql } } = adone;

    let server = null;

    before(async () => {
        server = mysql.createServer((conn) => {
            conn.serverHandshake({
                protocolVersion: 10,
                serverVersion: "5.6.10",
                connectionId: 1234,
                statusFlags: 2,
                characterSet: 8,
                capabilityFlags: 0xffffff,
                authCallback(params, cb) {
                    cb(null, { message: "too many connections", code: 1040 });
                }
            });
        });
        await new Promise((resolve) => server.listen(0, resolve));
    });

    after((done) => {
        server.close(done);
    });

    it("throw connect error using connection", async () => {
        const { port } = server.address();
        const err = await createConnection({
            port,
            host: "localhost",
            user: "test_user",
            password: "test",
            database: "test_database"
        }).then(() => null, (e) => e);
        expect(err).not.to.be.null;
        expect(err.errno).to.be.equal(1040);
    });

    it("throw connect error using pool", async () => {
        const { port } = server.address();
        const pool = await createPool({
            port,
            host: "localhost",
            user: "test_user",
            password: "test",
            database: "test_database"
        });
        const err = await pool.query("select 1").then(() => null, (e) => e);
        expect(err).not.to.be.null;
        expect(err.errno).to.be.equal(1040);
    });
});
