import { createConnection, config } from "../../common";

describe("database", "mysql", "functional", "connection", "multiple results", () => {
    const { is } = adone;
    let connection = null;
    let q = null;

    before(async () => {
        connection = createConnection({ multipleStatements: true, promise: false });
        q = (...args) => new Promise((resolve, reject) => {
            connection.query(...args, (err, res, fields) => {
                err ? reject(err) : resolve([res, fields]);
            });
        });
        await q("CREATE TEMPORARY TABLE no_rows (test int)");
        await q("CREATE TEMPORARY TABLE some_rows (test int)");
        await q("INSERT INTO some_rows values(0)");
        await q("INSERT INTO some_rows values(42)");
        await q("INSERT INTO some_rows values(314149)");
    });

    after(async () => {
        if (connection) {
            connection.end();
        }
    });

    const rs1 = {
        affectedRows: 0,
        fieldCount: 0,
        insertId: 0,
        serverStatus: 10,
        warningStatus: 0,
        info: ""
    };

    const rs2 = Object.assign({}, rs1, {
        serverStatus: 2
    });

    const twoInsertResult = [[rs1, rs2], [undefined, undefined], 2];

    const select1 = [{ 1: 1 }];
    const select2 = [{ 2: 2 }];
    const select3 = [{ test: 0 }, { test: 42 }, { test: 314149 }];

    const _fields = {
        catalog: "def",
        characterSet: 63,
        columnLength: 1,
        columnType: 8,
        decimals: 0,
        flags: 129,
        name: "1",
        orgName: "",
        orgTable: "",
        schema: "",
        table: ""
    };
    const fields1 = [_fields];

    const fields2 = [Object.assign({}, _fields, {
        name: "2"
    })];

    const _nrFields = {
        catalog: "def",
        characterSet: 63,
        columnLength: 11,
        columnType: 3,
        decimals: 0,
        flags: 0,
        name: "test",
        orgName: "test",
        orgTable: "no_rows",
        schema: config.database,
        table: "no_rows"
    };

    const nrFields = [_nrFields];

    const srFields = [Object.assign({}, _nrFields, {
        orgTable: "some_rows",
        table: "some_rows"
    })];

    const tests = [
        ["select * from some_rows", [select3, srFields, 1]], //  select 3 rows
        ["SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT; SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS;", twoInsertResult],
        ["/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;", twoInsertResult], // issue #26
        ["set @a = 1", [rs2, undefined, 1]],  // one insert result
        ["set @a = 1; set @b = 2", twoInsertResult],
        ["select 1; select 2", [[select1, select2], [fields1, fields2], 2]],
        ["set @a = 1; select 1", [[rs1, select1], [undefined, fields1], 2]],
        ["select 1; set @a = 1", [[select1, rs2], [fields1, undefined], 2]],
        ["select * from no_rows", [[], nrFields, 1]],    // select 0 rows"
        ["set @a = 1; select * from no_rows", [[rs1, []], [undefined, nrFields], 2]], // insert + select 0 rows
        ["select * from no_rows; set @a = 1", [[[], rs2], [nrFields, undefined], 2]], //  select 0 rows + insert
        ["set @a = 1; select * from some_rows", [[rs1, select3], [undefined, srFields], 2]], // insert + select 3 rows
        ["select * from some_rows; set @a = 1", [[select3, rs2], [srFields, undefined], 2]] //  select 3 rows + insert
    ];

    const arrOrColumn = (c) => {
        if (is.array(c)) {
            return c.map(arrOrColumn);
        }

        if (is.undefined(c)) {
            return;
        }

        return c.inspect();
    };

    for (const [sql, expectation] of tests) {
        // eslint-disable-next-line
        specify(sql, async () => {
            const [rows, fields] = await q(sql);

            let numResults = 0;
            if (rows.constructor.name === "ResultSetHeader") {
                numResults = 1;
            } else if (rows.length === 0) {
                // empty select
                numResults = 1;
            } else if (rows.length > 0) {
                if (rows.constructor.name === "Array" && rows[0].constructor.name === "TextRow") {
                    numResults = 1;
                }

                if (rows.constructor.name === "Array" && (rows[0].constructor.name === "Array" || rows[0].constructor.name === "ResultSetHeader")) {
                    numResults = rows.length;
                }
            }

            expect([rows, arrOrColumn(fields), numResults]).to.be.deep.equal(expectation);

            await new Promise((resolve, reject) => {
                const q = connection.query(sql);

                let fieldIndex = -1;
                let rowIndex = 0;
                let resIndex = 0;

                q.on("result", (row) => {
                    try {
                        if (numResults === 1) {
                            expect(fieldIndex).to.be.equal(0);
                            if (row.constructor.name === "ResultSetHeader") {
                                expect(row).to.be.deep.equal(rows);
                            } else {
                                expect(row).to.be.deep.equal(rows[rowIndex]);
                            }
                        } else {
                            if (resIndex !== fieldIndex) {
                                [rowIndex, resIndex] = [0, fieldIndex];
                            }
                            if (row.constructor.name === "ResultSetHeader") {
                                expect(row).to.be.deep.equal(rows[fieldIndex]);
                            } else {
                                expect(row).to.be.deep.equal(rows[fieldIndex][rowIndex]);
                            }
                        }
                        ++rowIndex;
                    } catch (err) {
                        reject(err);
                    }
                });

                q.on("fields", (_fields) => {
                    ++fieldIndex;
                    try {
                        if (numResults === 1) {
                            expect(fieldIndex).to.be.equal(0);
                            expect(arrOrColumn(fields)).to.be.deep.equal(arrOrColumn(_fields));
                        } else {
                            expect(arrOrColumn(fields[fieldIndex]))
                                .to.be.deep.equal(arrOrColumn(_fields));
                        }
                    } catch (err) {
                        reject(err);
                    }
                });

                q.once("end", resolve);
            });
        });
    }
});
