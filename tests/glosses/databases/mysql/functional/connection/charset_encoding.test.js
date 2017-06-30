import { createConnection } from "../../common";

describe("database", "mysql", "functional", "connection", "charset encoding", () => {
    let connection = null;

    before(async () => {
        connection = await createConnection();
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    const testData = [
        "ютф восемь",
        "Experimental",
        "परीक्षण",
        "test тест テスト փորձաsրկում পরীক্ষা kiểm tra",
        "ტესტი પરીક્ષણ  מבחן פּרובירן اختبار"
    ];

    it("should work", async () => {
        await connection.query(`
            CREATE TEMPORARY TABLE \`test-charset-encoding\`
            ( \`field\` VARCHAR(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci)
        `);
        for (const data of testData) {
            // eslint-disable-next-line
            await connection.query(
                "INSERT INTO `test-charset-encoding` (field) values(?)",
                [data]
            );
        }
        const [rows] = await connection.query("SELECT * from `test-charset-encoding`");
        expect(rows.map((x) => x.field)).to.be.deep.equal(testData);
    });
});
