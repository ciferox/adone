import { createConnection } from "../../common";

describe("glosses", "databases", "mysql", "functional", "connection", "insert", "bigint", () => {
    const { math: { Long } } = adone;

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

    it("should set correct id", async () => {
        await connection.query("INSERT INTO bigs SET title='test', id=123");
        const [res] = await connection.query("INSERT INTO bigs SET title='test1'");
        expect(res.insertId).to.be.equal(124);
    });

    it("should set correct id (>24 bits)", async () => {
        await connection.query("INSERT INTO bigs SET title='test', id=123456789");
        const [res] = await connection.query("INSERT INTO bigs SET title='test2'");
        expect(res.insertId).to.be.equal(123456790);
    });

    it("should set correct id (bigint)", async () => {
        await connection.query("INSERT INTO bigs SET title='test', id=9007199254740992");
        let [res] = await connection.query("INSERT INTO bigs SET title='test3'");
        expect(Long.fromString("9007199254740993").compare(res.insertId)).to.be.equal(0);

        await connection.query("INSERT INTO bigs SET title='test', id=90071992547409924");
        [res] = await connection.query("INSERT INTO bigs SET title='test4'");
        expect(Long.fromString("90071992547409925").compare(res.insertId)).to.be.equal(0);
    });

    it("should select them", async () => {
        const [rows] = await connection.query({
            sql: "select * from bigs",
            supportBigNumbers: true,
            bigNumberString: false
        });

        expect(rows[0].id).to.be.equal(123);
        expect(rows[1].id).to.be.equal(124);
        expect(rows[2].id).to.be.equal(123456789);
        expect(rows[3].id).to.be.equal(123456790);
        expect(rows[4].id).to.be.equal(9007199254740992);
        expect(rows[5].id).to.be.equal("9007199254740993");
        expect(rows[6].id).to.be.equal("90071992547409924");
        expect(rows[7].id).to.be.equal("90071992547409925");
    });
});
