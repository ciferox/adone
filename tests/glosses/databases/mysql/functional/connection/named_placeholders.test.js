import { createConnection, createPool } from "../../common";

describe("database", "mysql", "functional", "connection", "named placeholders", () => {
    const { promise } = adone;
    let connection = null;

    before(async () => {
        connection = await createConnection();
        await connection.query(`
            CREATE TEMPORARY TABLE \`test_table\` (
                \`id\` int(11) unsigned NOT NULL AUTO_INCREMENT,
                \`num1\` int(15),
                \`num2\` int(15),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8
        `);
        await connection.query("insert into test_table(num1,num2) values(?, 3)", [1]);
        await connection.query("insert into test_table(num1,num2) values(3-?, -10)", [5]);
        await connection.query("insert into test_table(num1,num2) values(4+?, 4000000-?)", [-5, 8000000]);
        await connection.query("insert into test_table(num1,num2) values(?, ?)", [-5, 8000000]);
        connection.config.namedPlaceholders = true;
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    it("should select using named placeholders in params (execute)", async () => {
        const defer = promise.defer();
        const cmd = connection.connection.execute(
            "select * from test_table where num1 < :numParam and num2 > :lParam",
            { lParam: 100, numParam: 2 },
            (err, rows) => err ? defer.reject(err) : defer.resolve(rows)
        );
        expect(cmd.sql).to.be.equal("select * from test_table where num1 < ? and num2 > ?");
        expect(cmd.values).to.be.deep.equal([2, 100]);
        const rows = await defer.promise;
        expect(rows).to.be.deep.equal([{ id: 4, num1: -5, num2: 8000000 }]);
    });

    it("should select using named placeholders in expressions (execute)", async () => {
        const [rows] = await connection.execute("select :a + :a as sum", { a: 2 });
        expect(rows).to.be.deep.equal([{ sum: 4 }]);
    });

    it("should select using named placeholders in params (query)", async () => {
        const defer = promise.defer();
        const cmd = connection.connection.query(
            "select * from test_table where num1 < :numParam and num2 > :lParam",
            { lParam: 100, numParam: 2 },
            (err, rows) => err ? defer.reject(err) : defer.resolve(rows)
        );
        expect(cmd.sql).to.be.equal("select * from test_table where num1 < 2 and num2 > 100");
        expect(cmd.values).to.be.deep.equal([2, 100]);
        const rows = await defer.promise;
        expect(rows).to.be.deep.equal([{ id: 4, num1: -5, num2: 8000000 }]);
    });

    it("should select using named placeholders in expressions (execute)", async () => {
        const [rows] = await connection.query("select :a + :a as sum", { a: 2 });
        expect(rows).to.be.deep.equal([{ sum: 4 }]);
    });

    it("should format a query", () => {
        const sql = connection.format(
            "SELECT * from test_table where num1 < :numParam and num2 > :lParam",
            { lParam: 100, numParam: 2 }
        );
        expect(sql).to.be.equal("SELECT * from test_table where num1 < 2 and num2 > 100");
    });

    it("should work using a pool", async () => {
        const pool = await createPool();
        pool.config.connectionConfig.namedPlaceholders = true;
        const [rows] = await pool.query("SELECT :a + :a as sum", { a: 2 });
        expect(rows).to.be.deep.equal([{ sum: 4 }]);
        pool.end();
    });
});
