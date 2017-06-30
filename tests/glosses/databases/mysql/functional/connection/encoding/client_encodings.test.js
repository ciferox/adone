import { createConnection } from "../../../common";

describe("database", "mysql", "functional", "connection", "encoding", "client encodings", () => {
    specify("UTF8MB4_GENERAL_CI", async () => {
        const connection = await createConnection({ charset: "UTF8MB4_GENERAL_CI" });
        try {
            await connection.query("drop table if exists __test_client_encodings");
            await connection.query("create table if not exists __test_client_encodings (name VARCHAR(200)) CHARACTER SET=utf8mb4");
            await connection.query("delete from __test_client_encodings");
        } finally {
            await connection.end();
        }
    });

    specify("CP1251_GENERAL_CI/KOI8R_GENERAL_CI", async () => {
        let connection = await createConnection({ charset: "CP1251_GENERAL_CI" });
        try {
            await connection.query('insert into __test_client_encodings values("привет, мир")');
            await connection.end();
            connection = await createConnection({ charset: "KOI8R_GENERAL_CI" });
            const [rows] = await connection.query("select * from __test_client_encodings");
            assert.equal(rows[0].name, "привет, мир");
        } finally {
            connection.end();
        }
    });
});
