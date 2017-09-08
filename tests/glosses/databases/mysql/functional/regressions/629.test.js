import { createConnection } from "../../common";

describe("database", "mysql", "functional", "regressions", "629", () => {
    let connection;

    before(async () => {
        connection = await createConnection({ dateStrings: false });
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    it("should correctly parse microsecond in datetime type", async () => {
        const tableName = "dates";
        const testFields = ["id", "date1", "date2", "name"];
        const testRows = [
            [1, "2017-07-26 09:36:42.000", "2017-07-29 09:22:24.000", "John"],
            [2, "2017-07-26 09:36:42.123", "2017-07-29 09:22:24.321", "Jane"]
        ];
        const expected = [
            {
                id: 1,
                date1: new Date("2017-07-26 09:36:42.000"),
                date2: new Date("2017-07-29T09:22:24.000"),
                name: "John"
            },
            {
                id: 2,
                date1: new Date("2017-07-26T09:36:42.123"),
                date2: new Date("2017-07-29T09:22:24.321"),
                name: "Jane"
            }
        ];

        await connection.query(`set time_zone = '${adone.datetime().format("Z")}'`);

        await connection.query(`
            CREATE TEMPORARY TABLE \`${tableName}\` (
             \`${testFields[0]}\` int,
             \`${testFields[1]}\` TIMESTAMP(3),
             \`${testFields[2]}\` DATETIME(3),
             \`${testFields[3]}\` varchar(10)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8
        `);
        await connection.query(`
            INSERT INTO \`${tableName}\` VALUES
            (${testRows[0][0]},"${testRows[0][1]}", "${testRows[0][2]}", "${testRows[0][3]}"),
            (${testRows[1][0]},"${testRows[1][1]}", "${testRows[1][2]}", "${testRows[1][3]}")
        `);

        const [rows] = await connection.execute(`SELECT * FROM \`${tableName}\``);

        expected.map((exp, index) => {
            const row = rows[index];
            Object.keys(exp).map((key) => {
                if (key.startsWith("date")) {
                    assert.equal(Number(exp[key]), Number(row[key]));
                } else {
                    assert.equal(exp[key], row[key]);
                }
            });
        });
    });
});
