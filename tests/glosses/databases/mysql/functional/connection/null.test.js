import { createConnection } from "../../common";

describe("glosses", "databases", "mysql", "functional", "connection", "null", () => {
    let connection = null;

    before(async () => {
        connection = await createConnection();
        await connection.query("CREATE TEMPORARY TABLE t (i int)");
        await connection.query("INSERT INTO t VALUES(null)");
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    it("should select null", async () => {
        let [rows, fields] = await connection.query("SELECT cast(NULL AS CHAR)");
        expect(rows).to.be.deep.equal([{ "cast(NULL AS CHAR)": null }]);
        expect(fields[0].columnType).to.be.equal(253);
        [rows, fields] = await connection.query("SELECT * from t");
        expect(rows).to.be.deep.equal([{ i: null }]);
        expect(fields[0].columnType).to.be.equal(3);
    });
});
