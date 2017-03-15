import { createConnection } from "../../../common";

describe("glosses", "databases", "mysql", "functional", "connection", "encoding", "track encodings", () => {
    const text = "привет, мир";

    let connection = null;

    before(async () => {
        connection = await createConnection();
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    it("should work", async () => {
        await connection.query("SET character_set_client=koi8r");
        let [rows] = await connection.query("SELECT ?", [text]);
        assert.equal(rows[0][text], text);

        await connection.query("SET character_set_client=cp1251");
        [rows] = await connection.query("SELECT ?", [text]);
        assert.equal(rows[0][text], text);
    });
});
