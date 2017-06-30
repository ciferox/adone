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

    it("should accept an exdate as the argument", async () => {
        await connection.query("set time_zone = '+00:00'");
        const t = adone.datetime.utc();
        const [rows] = await connection.execute("SELECT UNIX_TIMESTAMP(?) t", [t]);
        expect(rows).to.be.deep.equal([{ t: t.unix() }]);
    });

    it("should accept a date as the argument", async () => {
        await connection.query("set time_zone = '+00:00'");
        const t = new Date();
        const [rows] = await connection.execute("SELECT UNIX_TIMESTAMP(?) t", [t]);
        expect(rows[0].t).to.be.a("number");
    });
});
