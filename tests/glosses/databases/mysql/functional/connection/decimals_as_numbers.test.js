import { createConnection } from "../../common";

describe("database", "mysql", "functional", "connection", "decimals as numbers", () => {
    let connection = null;
    let connection1 = null;

    const largeDecimal = 900719.547409;
    const largeMoneyValue = 900719925474.99;

    before(async () => {
        connection = await createConnection({
            decimalNumbers: false
        });
        await connection.query("CREATE TEMPORARY TABLE t1 (d1 DECIMAL(65, 30))");
        await connection.query("INSERT INTO t1 set d1=?", [largeDecimal]);

        connection1 = await createConnection({
            decimalNumbers: true
        });
        await connection1.query("CREATE TEMPORARY TABLE t2 (d1 DECIMAL(14, 2))");
        await connection1.query("INSERT INTO t2 set d1=?", [largeMoneyValue]);
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
        if (connection1) {
            await connection1.end();
        }
    });

    it("should return a string", async () => {
        const [rows] = await connection.execute("select d1 from t1");
        expect(rows[0].d1).to.be.a("string");
        expect(rows[0].d1).to.be.equal("900719.547409000000000000000000000000");
    });

    it("should return a number", async () => {
        const [rows] = await connection1.execute("select d1 from t2");
        expect(rows[0].d1).to.be.a("number");
        expect(rows[0].d1).to.be.equal(largeMoneyValue);
    });
});
