import Support from "./support";
import config from "../config/config";

const dialect = Support.getTestDialect();
const Sequelize = Support.Sequelize;
const { orm } = adone;
const fs = require("fs");
const path = require("path");

if (dialect === "sqlite") {
  var sqlite3 = require('sqlite3'); // eslint-disable-line
}

describe(Support.getTestDialectTeaser("Configuration"), () => {
    describe("Connections problems should fail with a nice message", () => {
        it("when we don't have the correct server details", async () => {
            const seq = orm.create(config[dialect].database, config[dialect].username, config[dialect].password, { storage: "/path/to/no/where/land", logging: false, host: "0.0.0.1", port: config[dialect].port, dialect });
            if (dialect === "sqlite") {
                // SQLite doesn't have a breakdown of error codes, so we are unable to discern between the different types of errors.
                await assert.throws(async () => {
                    await seq.query("select 1 as hello");
                }, seq.ConnectionError, "SQLITE_CANTOPEN: unable to open database file");
            }
            const err = await assert.throws(async () => {
                await seq.query("select 1 as hello");
            });
            if (!(err instanceof seq.InvalidConnectionError) && !(err instanceof seq.HostNotReachableError)) {
                assert.fail("expected error to be instance of InvalidConnectionError or HostNotReachableError");
            }
        });

        it("when we don't have the correct login information", async () => {
            if (dialect === "mssql") {
                // NOTE: Travis seems to be having trouble with this test against the
                //       AWS instance. Works perfectly fine on a local setup.
                expect(true).to.be.true;
                return;
            }

            const seq = orm.create(config[dialect].database, config[dialect].username, "fakepass123", { logging: false, host: config[dialect].host, port: 1, dialect });
            if (dialect === "sqlite") {
                // SQLite doesn't require authentication and `select 1 as hello` is a valid query, so this should be fulfilled not rejected for it.
                await seq.query("select 1 as hello");
            }
            await assert.throws(async () => {
                await seq.query("select 1 as hello");
            }, seq.ConnectionRefusedError, "connect ECONNREFUSED");
        });

        it("when we don't have a valid dialect.", () => {
            expect(() => {
                orm.create(config[dialect].database, config[dialect].username, config[dialect].password, { host: "0.0.0.1", port: config[dialect].port, dialect: "some-fancy-dialect" });
            }).to.throw(Error, /The dialect some-fancy-dialect is not supported\. Supported dialects:/);
        });
    });

    describe("Instantiation with arguments", () => {
        if (dialect === "sqlite") {
            it.skip("should respect READONLY / READWRITE connection modes", async () => { // TODO
                const p = path.join(__dirname, "../tmp", "foo.sqlite");
                const createTableFoo = "CREATE TABLE foo (faz TEXT);";
                const createTableBar = "CREATE TABLE bar (baz TEXT);";

                const testAccess = Promise.method(() => {
                    if (fs.access) {
                        return Promise.promisify(fs.access)(p, fs.R_OK | fs.W_OK);
                    } // Node v0.10 and older don't have fs.access
                    return Promise.promisify(fs.open)(p, "r+")
                        .then((fd) => {
                            return Promise.promisify(fs.close)(fd);
                        });

                });

                return Promise.promisify(fs.unlink)(p)
                    .catch((err) => {
                        expect(err.code).to.equal("ENOENT");
                    })
                    .then(() => {
                        const sequelizeReadOnly = new Sequelize("sqlite://foo", {
                            storage: p,
                            dialectOptions: {
                                mode: sqlite3.OPEN_READONLY
                            }
                        });
                        const sequelizeReadWrite = new Sequelize("sqlite://foo", {
                            storage: p,
                            dialectOptions: {
                                mode: sqlite3.OPEN_READWRITE
                            }
                        });

                        expect(sequelizeReadOnly.config.dialectOptions.mode).to.equal(sqlite3.OPEN_READONLY);
                        expect(sequelizeReadWrite.config.dialectOptions.mode).to.equal(sqlite3.OPEN_READWRITE);

                        return Promise.all([
                            sequelizeReadOnly.query(createTableFoo)
                                .should.be.rejectedWith(Error, "SQLITE_CANTOPEN: unable to open database file"),
                            sequelizeReadWrite.query(createTableFoo)
                                .should.be.rejectedWith(Error, "SQLITE_CANTOPEN: unable to open database file")
                        ]);
                    })
                    .then(() => {
                        // By default, sqlite creates a connection that's READWRITE | CREATE
                        const sequelize = new Sequelize("sqlite://foo", {
                            storage: p
                        });
                        return sequelize.query(createTableFoo);
                    })
                    .then(testAccess)
                    .then(() => {
                        const sequelizeReadOnly = new Sequelize("sqlite://foo", {
                            storage: p,
                            dialectOptions: {
                                mode: sqlite3.OPEN_READONLY
                            }
                        });
                        const sequelizeReadWrite = new Sequelize("sqlite://foo", {
                            storage: p,
                            dialectOptions: {
                                mode: sqlite3.OPEN_READWRITE
                            }
                        });

                        return Promise.all([
                            sequelizeReadOnly.query(createTableBar)
                                .should.be.rejectedWith(Error, "SQLITE_READONLY: attempt to write a readonly database"),
                            sequelizeReadWrite.query(createTableBar)
                        ]);
                    })
                    .finally(() => {
                        return Promise.promisify(fs.unlink)(p);
                    });
            });
        }
    });

});
