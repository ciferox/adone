import { createConnection } from "../../common";

describe("glosses", "databases", "mysql", "functional", "connection", "timestamp", () => {
    let connection = null;

    before(async () => {
        connection = await createConnection();
        await connection.query('SET SESSION SQL_MODE="ALLOW_INVALID_DATES"');
        await connection.query("CREATE TEMPORARY TABLE t (f TIMESTAMP)");
        await connection.query("INSERT INTO t VALUES('0000-00-00 00:00:00')");
        await connection.query("INSERT INTO t VALUES('2013-01-22 01:02:03')");
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    it("should select timestamps", async () => {
        const [rows, fields] = await connection.query("SELECT f FROM t");
        expect(rows[0].f).to.be.a("date");
        expect(rows[0].f.toString()).to.be.equal("Invalid Date");
        expect(fields[0].name).to.be.equal("f");

        expect(rows[1].f).to.be.a("date");
        expect(rows[1].f.toString()).not.to.be.equal("Invalid Date");
        expect(rows[1].f.getYear()).to.be.equal(113);
        expect(rows[1].f.getMonth()).to.be.equal(0);
        expect(rows[1].f.getDate()).to.be.equal(22);
        expect(rows[1].f.getHours()).to.be.equal(1);
        expect(rows[1].f.getMinutes()).to.be.equal(2);
        expect(rows[1].f.getSeconds()).to.be.equal(3);
    });

    it("should reutrn a date instance from current_timestamp", async () => {
        const [rows] = await connection.query("SELECT CURRENT_TIMESTAMP(6) as t11");
        expect(rows[0].t11).to.be.a("date");
    });
});
