import { createConnection } from "../../common";

describe("database", "mysql", "functional", "connection", "insert", "large blob", () => {
    let connection = null;

    before(async () => {
        connection = await createConnection();
        await connection.query(`
            CREATE TEMPORARY TABLE \`bigs\` (
                \`id\` bigint NOT NULL AUTO_INCREMENT,
                \`title\` varchar(255),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8
        `);
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    const length = 35777416;
    let connection2 = null;
    let content = null;
    let content1 = null;

    before(async function before() {
        this.timeout(30000);

        await connection.query(`SET GLOBAL max_allowed_packet=${length * 2 + 2000}`);
        connection2 = await createConnection();
        await connection2.query(`
                CREATE TEMPORARY TABLE \`insert_large_test\` (
                    \`id\` int(11) unsigned NOT NULL AUTO_INCREMENT,
                    \`content\` longblob NOT NULL,
                    PRIMARY KEY (\`id\`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8
            `);
        content = Buffer.allocUnsafe(length); // > 16 megabytes
        content1 = Buffer.allocUnsafe(length); // > 16 megabytes

        // this is to force compressed packed to be larger than uncompressed
        for (let i = 0; i < content.length; ++i) {
            content[i] = Math.floor(Math.random() * 256);
            content1[i] = Math.floor(Math.random() * 256);

            // low entropy version, compressed < uncompressed
            if (i < length / 2) {
                content1[i] = 100;
            }
        }
    });

    after(async () => {
        await connection.query("SET GLOBAL max_allowed_packet=1048576");
        if (connection2) {
            await connection2.end();
        }
    });

    it("should insert and select", async function test() {
        this.timeout(30000);

        let [res] = await connection2.query("INSERT INTO insert_large_test (content) VALUES(?)", [content]);
        let [rows] = await connection2.query(`SELECT * FROM insert_large_test WHERE id = ${res.insertId}`);
        expect(rows[0].id).to.be.equal(res.insertId);
        expect(rows[0].content).to.be.deep.equal(content);

        [res] = await connection2.query("INSERT INTO insert_large_test (content) VALUES(?)", [content1]);
        [rows] = await connection2.query(`SELECT * FROM insert_large_test WHERE id = ${res.insertId}`);
        expect(rows[0].id).to.be.equal(res.insertId);
        expect(rows[0].content).to.be.deep.equal(content1);

    });
});
