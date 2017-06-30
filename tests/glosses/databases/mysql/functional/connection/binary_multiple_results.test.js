import { createConnection, config } from "../../common";

describe("database", "mysql", "functional", "connection", "binary multiple results", () => {
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

    const rs3 = Object.assign({}, rs1, {
        serverStatus: 34
    });

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

    // prepared statements do not support multiple statements itself, we need to wrap quey in a stored procedure
    const procedurise = (sql) => `
        DROP PROCEDURE IF EXISTS _as_sp_call;
        CREATE PROCEDURE _as_sp_call()
        BEGIN
        ${sql};
        END
    `;

    const tests = [
        ["select * from some_rows", [[select3, rs3], [srFields, undefined], 2]], //  select 3 rows
        ["SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT; SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS", [rs2, undefined, 1]],
        ["set @a = 1", [rs2, undefined, 1]],
        ["set @a = 1; set @b = 2", [rs2, undefined, 1]],
        ["select 1; select 2", [[select1, select2, rs2], [fields1, fields2, undefined], 3]],
        ["set @a = 1; select 1", [[select1, rs2], [fields1, undefined], 2]],
        ["select 1; set @a = 1", [[select1, rs2], [fields1, undefined], 2]],
        ["select * from no_rows", [[[], rs3], [nrFields, undefined], 2]],    // select 0 rows"
        ["set @a = 1; select * from no_rows", [[[], rs3], [nrFields, undefined], 2]], // insert + select 0 rows
        ["select * from no_rows; set @a = 1", [[[], rs3], [nrFields, undefined], 2]], //  select 0 rows + insert
        ["set @a = 1; select * from some_rows", [[select3, rs3], [srFields, undefined], 2]], // insert + select 3 rows
        ["select * from some_rows; set @a = 1", [[select3, rs3], [srFields, undefined], 2]] //  select 3 rows + insert
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

    for (const [origSql, [expectedRows, expectedFields]] of tests) {
        // eslint-disable-next-line
        specify(origSql, async () => {
            const sp = procedurise(origSql);
            await q(sp);
            // this call is allowed with prepared statements, and result contain multiple statements
            const [rows, fields] = await q("CALL _as_sp_call()");
            expect(rows).to.be.deep.equal(expectedRows);
            expect(arrOrColumn(fields)).to.be.deep.equal(expectedFields);
            const { length: numResults = 1 } = fields || {};

            await new Promise((resolve, reject) => {
                const q = connection.query("CALL _as_sp_call()");

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
