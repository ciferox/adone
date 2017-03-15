import { createConnection } from "../../common";

describe("glosses", "databases", "mysql", "functional", "connection", "signed tinyint", () => {
    let connection = null;

    before(async () => {
        connection = await createConnection();
        await connection.query("CREATE TEMPORARY TABLE signed_ints  (b11 tinyint NOT NULL, b12 tinyint NOT NULL, b21 smallint NOT NULL)");
        await connection.query("INSERT INTO signed_ints values (-3, -120, 500)");
        await connection.query("INSERT INTO signed_ints values (3,  -110, -500)");
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    it("should work", async () => {
        const [rows] = await connection.execute("SELECT * from signed_ints", [5]);
        expect(rows).to.be.deep.equal([
            { b11: -3, b12: -120, b21: 500 },
            { b11: 3, b12: -110, b21: -500 }
        ]);
    });
});
