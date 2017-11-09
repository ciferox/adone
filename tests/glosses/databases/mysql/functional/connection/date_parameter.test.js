import { createConnection } from "../../common";

describe("database", "mysql", "functional", "connection", "date parameter", () => {
    let connection = null;

    before(async () => {
        connection = await createConnection();
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    it("should accept a datetime as the argument", async () => {
        await connection.query("set time_zone = '+00:00'");
        const t = adone.datetime.utc();
        const [rows] = await connection.execute("SELECT UNIX_TIMESTAMP(?) t", [t]);
        expect(rows).to.be.deep.equal([{ t: t.format("X.SSS") }]);
    });

    it("should accept a date as the argument", async () => {
        await connection.query("set time_zone = '+00:00'");
        const t = new Date();
        const [rows] = await connection.execute("SELECT UNIX_TIMESTAMP(?) t", [t]);
        expect(rows[0].t).to.be.a("string"); // UNIX_TIMESTAMP returns a decimal which returns strings
    });
});
