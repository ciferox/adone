import { createConnection } from "../../common";

describe("database", "mysql", "functional", "connection", "null buffer", () => {
    let connection = null;

    before(async () => {
        connection = await createConnection();
        await connection.query("CREATE TEMPORARY TABLE binary_table (stuff BINARY(16));");
        await connection.query("INSERT INTO binary_table VALUES(null)");
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    it("should select null for text protocol", async () => {
        const [rows] = await connection.query("SELECT * from binary_table");
        expect(rows).to.be.deep.equal([
            { stuff: null }
        ]);
    });

    it("should select null for binary protocol", async () => {
        const [rows] = await connection.execute("SELECT * from binary_table");
        expect(rows).to.be.deep.equal([
            { stuff: null }
        ]);
    });
});
