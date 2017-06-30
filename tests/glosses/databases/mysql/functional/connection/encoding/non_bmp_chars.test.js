import { createConnection } from "../../../common";

describe("database", "mysql", "functional", "connection", "encoding", "non bmp chars", () => {
    // 4 bytes in utf8
    const payload = "💩";

    specify("UTF8_GENERAL_CI", async () => {
        const connection = await createConnection({ charset: "UTF8_GENERAL_CI" });
        try {
            const [rows, fields] = await connection.query('select "💩"');
            assert.equal(fields[0].name, payload);
            assert.equal(rows[0][fields[0].name], payload);
        } finally {
            await connection.end();
        }
    });

    specify("UTF8MB4_GENERAL_CI", async () => {
        const connection = await createConnection({ charset: "UTF8MB4_GENERAL_CI" });
        try {
            const [rows, fields] = await connection.query('select "💩"');
            assert.equal(fields[0].name, "?");
            assert.equal(rows[0]["?"], payload);
        } finally {
            connection.end();
        }
    });
});
