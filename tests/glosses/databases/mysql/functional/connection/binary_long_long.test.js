import { createConnection } from "../../common";

describe("database", "mysql", "functional", "connection", "binary long long", () => {
    const { util } = adone;

    let connection = null;

    before(async () => {
        connection = await createConnection();
        await connection.query(`
            CREATE TEMPORARY TABLE \`tmp_longlong\` (
                \`id\` int(11) NOT NULL AUTO_INCREMENT,
                \`ls\` BIGINT SIGNED NOT NULL,
                \`lu\` BIGINT UNSIGNED NOT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8;
        `);

        const values = [
            ["10", "10"],
            ["-11", "11"],
            ["965432100123456789", "1965432100123456789"],
            ["-965432100123456789", "2965432100123456789"]
        ];


        for (const [i, [ls, lu]] of util.enumerate(values)) {
            // eslint-disable-next-line
            await connection.query("INSERT INTO `tmp_longlong` VALUES (?, ?, ?)", [i + 1, ls, lu]);
        }
    });

    after(async () => {
        if (connection) {
            await connection.end();
        }
    });

    const expectation = {
        [false]: {
            [false]: [
                { id: 1, ls: 10, lu: 10 },
                { id: 2, ls: -11, lu: 11 },
                { id: 3, ls: 965432100123456800, lu: 1965432100123456800 },
                { id: 4, ls: -965432100123456800, lu: 2965432100123457000 }
            ]
        },
        [true]: {
            [false]: [
                { id: 1, ls: 10, lu: 10 },
                { id: 2, ls: -11, lu: 11 },
                { id: 3, ls: "965432100123456789", lu: "1965432100123456789" },
                { id: 4, ls: "-965432100123456789", lu: "2965432100123456789" }
            ],
            [true]: [
                { id: 1, ls: 10, lu: 10 },
                { id: 2, ls: -11, lu: 11 },
                { id: 3, ls: "965432100123456789", lu: "1965432100123456789" },
                { id: 4, ls: "-965432100123456789", lu: "2965432100123456789" }
            ]
        }
    };

    for (const method of ["query", "execute"]) {
        for (const [supportBigNumbers, bigNumerStrings] of [
            [false, false],
            [true, false],
            [true, true]
        ]) {
            const name = `using "${method}" with supportBigNumber = ${supportBigNumbers}, bigNumerStrings = ${bigNumerStrings}`;
            // eslint-disable-next-line
            specify(name, async () => {
                const [rows] = await connection[method]({
                    sql: "SELECT * from tmp_longlong",
                    supportBigNumbers,
                    bigNumerStrings
                });

                expect(rows).to.be.deep.equal(expectation[supportBigNumbers][bigNumerStrings]);
            });
        }
    }
});
