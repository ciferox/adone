import { createConnection } from "../../common";

describe("glosses", "databases", "mysql", "functional", "connection", "nested tables", () => {
    let connection = null;

    before(async () => {
        connection = await createConnection();
        await connection.query(`
            CREATE TEMPORARY TABLE \`nested_test\` (
                \`id\` int(11) unsigned NOT NULL AUTO_INCREMENT,
                \`title\` varchar(255),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8
        `);
        await connection.query("INSERT INTO nested_test SET ?", { title: "test" });
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    for (const method of ["execute", "query"]) {
        // eslint-disable-next-line
        specify(`nestTabled = true, method = ${method}`, async () => {
            const [rows] = await connection[method]({
                nestTables: true,
                sql: "SELECT * FROM nested_test"
            });
            expect(rows).to.have.lengthOf(1);
            expect(rows[0].nested_test.id).to.be.equal(1);
            expect(rows[0].nested_test.title).to.be.equal("test");
        });

        // eslint-disable-next-line
        specify(`nestTabled = _, method = ${method}`, async () => {
            const [rows] = await connection[method]({
                nestTables: "_",
                sql: "SELECT * FROM nested_test"
            });
            expect(rows).to.have.lengthOf(1);
            expect(rows[0].nested_test_id).to.be.equal(1);
            expect(rows[0].nested_test_title).to.be.equal("test");
        });

        // eslint-disable-next-line
        specify(`rowsAsArray = true,, method = ${method}`, async () => {
            const [rows] = await connection[method]({
                rowsAsArray: true,
                sql: "SELECT * FROM nested_test"
            });
            expect(rows).to.have.lengthOf(1);
            expect(rows[0]).to.be.an("array");
            expect(rows[0][0]).to.be.equal(1);
            expect(rows[0][1]).to.be.equal("test");
        });
    }
});
