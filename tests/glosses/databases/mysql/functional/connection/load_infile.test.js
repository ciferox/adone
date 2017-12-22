import { createConnection } from "../../common";

describe("database", "mysql", "functional", "connection", "load infile", () => {
    const { std: { path }, std: { stream } } = adone;

    let connection = null;

    before(async () => {
        connection = await createConnection();
        await connection.query(`
            CREATE TEMPORARY TABLE \`test\` (
                \`id\` int(11) unsigned NOT NULL AUTO_INCREMENT,
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

    it("should load from file", async () => {
        await connection.query(
            "LOAD DATA LOCAL INFILE ? INTO TABLE test CHARACTER SET UTF8 FIELDS TERMINATED BY ? (id, title)",
            [path.resolve(__dirname, "fixtures", "data.csv"), ","]
        );
        const [rows] = await connection.query("SELECT * FROM test");
        expect(rows).to.have.lengthOf(5);
        expect(rows[0].id).to.be.equal(1);
        expect(rows[0].title).to.be.equal("Hello World");
        expect(rows[1].id).to.be.equal(2);
        expect(rows[1].title).to.be.equal("This is a test");
        expect(rows[2].id).to.be.equal(3);
        expect(rows[2].title).to.be.equal("For loading data from a file");
        expect(rows[3].id).to.be.equal(4);
        expect(rows[3].title).to.be.equal("Привет");
        expect(rows[4].id).to.be.equal(5);
        expect(rows[4].title).to.be.equal("中文内容");
    });

    it("should reject if the file does not exist", async () => {
        const e = await connection.query(
            "LOAD DATA LOCAL INFILE ? INTO TABLE test CHARACTER SET UTF8 FIELDS TERMINATED BY ? (id, title)",
            [path.resolve(__dirname, "fixtures", "does_not_exist.csv"), ","]
        ).then(() => null, (e) => e);
        expect(e).not.to.be.null();
        expect(e.code).to.be.equal("ENOENT");
    });

    it("should use a custom stream", async () => {
        const createStream = () => {
            const s = new stream.PassThrough();

            setTimeout(() => {
                s.write("11,Hello World\n");
                s.write("21,One ");
                s.write("more row\n");
                s.end();
            }, 1000);

            return s;
        };

        const [res] = await connection.query({
            sql: "LOAD DATA LOCAL INFILE ? INTO TABLE test CHARACTER SET UTF8 FIELDS TERMINATED BY ? (id, title)",
            values: [path.resolve(__dirname, "fixtures", "does_not_exist.csv"), ","],
            infileStreamFactory: createStream
        });
        expect(res.affectedRows).to.be.equal(2);
        const [rows] = await connection.query("SELECT * FROM test");
        expect(rows).to.have.lengthOf(7);
        expect(rows[5].id).to.be.equal(11);
        expect(rows[5].title).to.be.equal("Hello World");
        expect(rows[6].id).to.be.equal(21);
        expect(rows[6].title).to.be.equal("One more row");
    });
});
