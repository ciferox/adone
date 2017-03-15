import { createConnection } from "../../common";

describe("glosses", "databases", "mysql", "functional", "connection", "null int", () => {
    let connection = null;

    before(async () => {
        connection = await createConnection();
        await connection.query("CREATE TEMPORARY TABLE t (i int)");
        await connection.query("INSERT INTO t VALUES(null)");
        await connection.query("INSERT INTO t VALUES(123)");
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    it("should select null", async () => {
        const [rows] = await connection.query("SELECT * from t");
        expect(rows).to.be.deep.equal([
            { i: null },
            { i: 123 }
        ]);
    });
});
