import { createConnection } from "../../common";

describe("database", "mysql", "functional", "regressions", "617", () => {
    let connection;

    before(async () => {
        connection = await createConnection({ dateStrings: true });
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    const tableName = "dates";
    const testFields = ["id", "date", "name"];
    const testRows = [
        [1, "2017-07-26 09:36:42.000", "John"],
        [2, "2017-07-26 09:36:42.123", "Jane"]
    ];
    const expected = [
        {
            id: 1,
            date: "2017-07-26 09:36:42",
            name: "John"
        },
        {
            id: 2,
            date: "2017-07-26 09:36:42.123000",
            name: "Jane"
        }
    ];

    it("should not fail", async () => {
        await connection.query(`
            CREATE TEMPORARY TABLE \`${tableName}\` (
                \`${testFields[0]}\` int,
                \`${testFields[1]}\` TIMESTAMP(3),
                \`${testFields[2]}\` varchar(10)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8`);
        await connection.query(`
            INSERT INTO \`${tableName}\` VALUES
                (${testRows[0][0]},"${testRows[0][1]}", "${testRows[0][2]}"),
                (${testRows[1][0]},"${testRows[1][1]}", "${testRows[1][2]}")
        `);
        const [rows] = await connection.execute(`SELECT * FROM \`${tableName}\``);
        expect(rows).to.be.deep.equal(expected);
    });
});
