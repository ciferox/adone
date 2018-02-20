describe("Sequelize", function () {
    const { is } = adone;
    const { orm } = adone;
    const { type, Transaction } = orm;

    const { vendor: { lodash: _ } } = adone;
    const dialect = this.getTestDialect();
    const current = this.sequelize;
    const config = this.config;

    const qq = function (str) {
        if (dialect === "postgres" || dialect === "mssql") {
            return `"${str}"`;
        } else if (dialect === "mysql" || dialect === "sqlite") {
            return `\`${str}\``;
        }
        return str;
    };

    describe("constructor", () => {
        afterEach(() => {
            orm.util.deprecate.restore && orm.util.deprecate.restore();
        });

        if (dialect !== "sqlite") {
            it.skip("should work with min connections", () => {
                const ConnectionManager = current.dialect.connectionManager;
                const connectionSpy = ConnectionManager.connect = spy(ConnectionManager.connect);

                this.createSequelizeInstance({
                    pool: {
                        min: 2
                    }
                });
                expect(connectionSpy).to.have.been.called.twice;
            });
        }

        it("should pass the global options correctly", () => {
            const sequelize = this.createSequelizeInstance({ logging: false, define: { underscored: true } });
            const DAO = sequelize.define("dao", { name: type.STRING });

            expect(DAO.options.underscored).to.be.ok();
        });

        it("should correctly set the host and the port", () => {
            const sequelize = this.createSequelizeInstance({ host: "127.0.0.1", port: 1234 });
            expect(sequelize.config.port).to.equal(1234);
            expect(sequelize.config.host).to.equal("127.0.0.1");
        });


        it("should log deprecated warning if operators aliases were not set", () => {
            stub(orm.util, "deprecate");
            this.createSequelizeInstance();
            expect(orm.util.deprecate.calledOnce).to.be.true();
            expect(orm.util.deprecate.args[0][0]).to.be.equal("String based operators are now deprecated. Please use Symbol based operators for better security, read more at http://docs.sequelizejs.com/manual/tutorial/querying.html#operators");
            orm.util.deprecate.reset();
            this.createSequelizeInstance({ operatorsAliases: {} });
            expect(orm.util.deprecate.called).to.be.false();
        });

        it("should set operators aliases on dialect QueryGenerator", () => {
            const operatorsAliases = { fake: true };
            const sequelize = this.createSequelizeInstance({ operatorsAliases });

            expect(sequelize).to.have.property("dialect");
            expect(sequelize.dialect).to.have.property("QueryGenerator");
            expect(sequelize.dialect.QueryGenerator).to.have.property("OperatorsAliasMap");
            expect(sequelize.dialect.QueryGenerator.OperatorsAliasMap).to.be.eql(operatorsAliases);
        });

        if (dialect === "sqlite") {
            it("should work with connection strings (1)", () => {
        const sequelize = orm.create('sqlite://test.sqlite'); // eslint-disable-line
            });
            it("should work with connection strings (2)", () => {
        const sequelize = orm.create('sqlite://test.sqlite/'); // eslint-disable-line
            });
            it("should work with connection strings (3)", () => {
        const sequelize = orm.create('sqlite://test.sqlite/lol?reconnect=true'); // eslint-disable-line
            });
        }

        if (dialect === "postgres") {
            const getConnectionUri = _.template("<%= protocol %>://<%= username %>:<%= password %>@<%= host %><% if(port) { %>:<%= port %><% } %>/<%= database %>");
            it("should work with connection strings (postgres protocol)", () => {
                const connectionUri = getConnectionUri(_.extend(config[dialect], { protocol: "postgres" }));
                // postgres://...
        const sequelize = orm.create(connectionUri); // eslint-disable-line
            });
            it("should work with connection strings (postgresql protocol)", () => {
                const connectionUri = getConnectionUri(_.extend(config[dialect], { protocol: "postgresql" }));
                // postgresql://...
        const sequelize = orm.create(connectionUri); // eslint-disable-line
            });
        }
    });

    if (dialect !== "sqlite") {
        describe("authenticate", () => {
            describe("with valid credentials", () => {
                it("triggers the success event", function () {
                    return this.sequelize.authenticate();
                });
            });

            describe("with an invalid connection", () => {
                beforeEach(function () {
                    const options = _.extend({}, this.sequelize.options, { port: "99999" });
                    this.sequelizeWithInvalidConnection = orm.create("wat", "trololo", "wow", options);
                });

                it("triggers the error event", function () {
                    return this
                        .sequelizeWithInvalidConnection
                        .authenticate()
                        .catch((err) => {
                            expect(err).to.not.be.null();
                        });
                });

                it("triggers an actual RangeError or ConnectionError", function () {
                    return this
                        .sequelizeWithInvalidConnection
                        .authenticate()
                        .catch((err) => {
                            expect(
                                err instanceof RangeError ||
                err instanceof orm.error.ConnectionError
                            ).to.be.ok();
                        });
                });

                it("triggers the actual adapter error", function () {
                    return this
                        .sequelizeWithInvalidConnection
                        .authenticate()
                        .catch((err) => {
                            expect(
                                err.message.match(/connect ECONNREFUSED/) ||
                                err.message.match(/invalid port number/) ||
                                err.message.match(/(?:should|must) be >=? 0 and < 65536/) ||
                                err.message.match(/Login failed for user/)
                            ).to.be.ok();
                        });
                });
            });

            describe("with invalid credentials", () => {
                beforeEach(function () {
                    this.sequelizeWithInvalidCredentials = orm.create("localhost", "wtf", "lol", this.sequelize.options);
                });

                it("triggers the error event", function () {
                    return this
                        .sequelizeWithInvalidCredentials
                        .authenticate()
                        .catch((err) => {
                            expect(err).to.not.be.null();
                        });
                });

                it("triggers an actual sequlize error", function () {
                    return this
                        .sequelizeWithInvalidCredentials
                        .authenticate()
                        .catch((err) => {
                            expect(err).to.be.instanceof(orm.error.ORMException);
                        });
                });

                it("triggers the error event when using replication", () => {
                    return orm.create("sequelize", null, null, {
                        dialect,
                        replication: {
                            read: {
                                host: "localhost",
                                username: "omg",
                                password: "lol"
                            }
                        }
                    }).authenticate()
                        .catch((err) => {
                            expect(err).to.not.be.null();
                        });
                });
            });
        });

        describe("validate", () => {
            it("is an alias for .authenticate()", function () {
                expect(this.sequelize.validate).to.equal(this.sequelize.authenticate);
            });
        });
    }

    describe("getDialect", () => {
        it("returns the defined dialect", function () {
            expect(this.sequelize.getDialect()).to.equal(dialect);
        });
    });

    describe("isDefined", () => {
        it("returns false if the dao wasn't defined before", function () {
            expect(this.sequelize.isDefined("Project")).to.be.false();
        });

        it("returns true if the dao was defined before", function () {
            this.sequelize.define("Project", {
                name: type.STRING
            });
            expect(this.sequelize.isDefined("Project")).to.be.true();
        });
    });

    describe("model", () => {
        it("throws an error if the dao being accessed is undefined", function () {
            const self = this;
            expect(() => {
                self.sequelize.model("Project");
            }).to.throw(/project has not been defined/i);
        });

        it("returns the dao factory defined by daoName", function () {
            const project = this.sequelize.define("Project", {
                name: type.STRING
            });

            expect(this.sequelize.model("Project")).to.equal(project);
        });
    });

    describe("query", () => {
        afterEach(function () {
            this.sequelize.options.quoteIdentifiers = true;

            console.log.restore && console.log.restore();
        });

        beforeEach(function () {
            this.User = this.sequelize.define("User", {
                username: type.STRING,
                emailAddress: {
                    type: type.STRING,
                    field: "email_address"
                }
            });

            this.insertQuery = `INSERT INTO ${qq(this.User.tableName)} (username, email_address, ${
                qq("createdAt")}, ${qq("updatedAt")
            }) VALUES ('john', 'john@gmail.com', '2012-01-01 10:10:10', '2012-01-01 10:10:10')`;

            return this.User.sync({ force: true });
        });

        it("executes a query the internal way", function () {
            return this.sequelize.query(this.insertQuery, { raw: true });
        });

        it("executes a query if only the sql is passed", function () {
            return this.sequelize.query(this.insertQuery);
        });


        describe("logging", () => {
            it("executes a query with global benchmarking option and default logger", () => {
                const logger = spy(console, "log");
                const sequelize = this.createSequelizeInstance({
                    logging: logger,
                    benchmark: true
                });

                return sequelize.query("select 1;").then(() => {
                    expect(logger.calledOnce).to.be.true();
                    expect(logger.args[0][0]).to.be.match(/Executed \(default\): select 1; Elapsed time: \d+ms/);
                });
            });

            // We can only test MySQL warnings when using MySQL.
            if (dialect === "mysql") {
                it("logs warnings when there are warnings", function () {

                    // Due to strict MySQL 5.7 all cases below will throw errors rather than warnings
                    if (adone.semver.gte(current.options.databaseVersion, "5.6.0")) {
                        return;
                    }

                    const logger = spy();
                    const sequelize = this.createSequelizeInstance({
                        logging: logger,
                        benchmark: false,
                        showWarnings: true
                    });
                    const insertWarningQuery = `INSERT INTO ${qq(this.User.tableName)} (username, email_address, ${
                        qq("createdAt")}, ${qq("updatedAt")
                    }) VALUES ('john', 'john@gmail.com', 'HORSE', '2012-01-01 10:10:10')`;

                    return sequelize.query(insertWarningQuery)
                        .then(() => {
                            expect(logger.callCount).to.equal(3);
                            expect(logger.args[2][0]).to.be.match(/^MySQL Warnings \(default\):.*?'createdAt'/m);
                        });
                });
            }

            it("executes a query with global benchmarking option and custom logger", () => {
                const logger = spy();
                const sequelize = this.createSequelizeInstance({
                    logging: logger,
                    benchmark: true
                });

                return sequelize.query("select 1;").then(() => {
                    expect(logger.calledOnce).to.be.true();
                    expect(logger.args[0][0]).to.be.equal("Executed (default): select 1;");
                    expect(is.number(logger.args[0][1])).to.be.true();
                });
            });

            it("executes a query with benchmarking option and default logger", function () {
                const logger = spy(console, "log");
                return this.sequelize.query("select 1;", {
                    logging: logger,
                    benchmark: true
                }).then(() => {
                    expect(logger.calledOnce).to.be.true();
                    expect(logger.args[0][0]).to.be.match(/Executed \(default\): select 1; Elapsed time: \d+ms/);
                });
            });

            it("executes a query with benchmarking option and custom logger", function () {
                const logger = spy();

                return this.sequelize.query("select 1;", {
                    logging: logger,
                    benchmark: true
                }).then(() => {
                    expect(logger.calledOnce).to.be.true();
                    expect(logger.args[0][0]).to.be.equal("Executed (default): select 1;");
                    expect(is.number(logger.args[0][1])).to.be.true();
                });
            });
        });

        it("executes select queries correctly", async function () {
            const self = this;
            await self.sequelize.query(this.insertQuery);
            const [users] = await self.sequelize.query(String(`select * from ${qq(self.User.tableName)}`));
            expect(users.map((u) => u.username)).to.include("john");
        });

        it("executes select queries correctly when quoteIdentifiers is false", async function () {
            const self = this;
            const seq = Object.create(self.sequelize);

            seq.options.quoteIdentifiers = false;
            await seq.query(this.insertQuery);
            const [users] = await seq.query(`select * from ${qq(self.User.tableName)}`);
            expect(users.map((u) => u.username)).to.include("john");
        });

        it("executes select query with dot notation results", async function () {
            const self = this;
            await self.sequelize.query(`DELETE FROM ${qq(self.User.tableName)}`);
            await self.sequelize.query(self.insertQuery);
            const [users] = await self.sequelize.query(String(`select username as ${qq("user.username")} from ${qq(self.User.tableName)}`));
            expect(users).to.deep.equal([{ "user.username": "john" }]);
        });

        it("executes select query with dot notation results and nest it", function () {
            const self = this;
            return self.sequelize.query(`DELETE FROM ${qq(self.User.tableName)}`).then(() => {
                return self.sequelize.query(self.insertQuery);
            }).then(() => {
                return self.sequelize.query(`select username as ${qq("user.username")} from ${qq(self.User.tableName)}`, { raw: true, nest: true });
            }).then((users) => {
                expect(users.map((u) => {
                    return u.user;
                })).to.deep.equal([{ username: "john" }]);
            });
        });

        if (dialect === "mysql") {
            it("executes stored procedures", function () {
                const self = this;
                return self.sequelize.query(this.insertQuery).then(() => {
                    return self.sequelize.query("DROP PROCEDURE IF EXISTS foo").then(() => {
                        return self.sequelize.query(
                            `CREATE PROCEDURE foo()\nSELECT * FROM ${self.User.tableName};`
                        ).then(() => {
                            return self.sequelize.query("CALL foo()").then((users) => {
                                expect(users.map((u) => {
                                    return u.username;
                                })).to.include("john");
                            });
                        });
                    });
                });
            });
        } else {
            console.log("FIXME: I want to be supported in this dialect as well :-(");
        }

        it("uses the passed model", async function () {
            await this.sequelize.query(this.insertQuery);
            const users = await this.sequelize.query(`SELECT * FROM ${qq(this.User.tableName)};`, {
                model: this.User
            });
            expect(users[0]).to.be.instanceof(this.User);
        });

        it("maps the field names to attributes based on the passed model", async function () {
            await this.sequelize.query(this.insertQuery);
            const users = await this.sequelize.query(`SELECT * FROM ${qq(this.User.tableName)};`, {
                model: this.User,
                mapToModel: true
            });
            expect(users[0].emailAddress).to.be.equal("john@gmail.com");
        });

        it("arbitrarily map the field names", async function () {
            await this.sequelize.query(this.insertQuery);
            const users = await this.sequelize.query(`SELECT * FROM ${qq(this.User.tableName)};`, {
                type: "SELECT",
                fieldMap: { username: "userName", email_address: "email" }
            });
            expect(users[0].userName).to.be.equal("john");
            expect(users[0].email).to.be.equal("john@gmail.com");
        });

        it("reject if `values` and `options.replacements` are both passed", async function () {
            await assert.throws(async () => {
                await this.sequelize.query({ query: "select ? as foo, ? as bar", values: [1, 2] }, { raw: true, replacements: [1, 2] });
            }, "Both `sql.values` and `options.replacements` cannot be set at the same time");
        });

        it("reject if `sql.bind` and `options.bind` are both passed", async function () {
            await assert.throws(async () => {
                await this.sequelize.query({ query: "select $1 + ? as foo, $2 + ? as bar", bind: [1, 2] }, { raw: true, bind: [1, 2] });
            }, "Both `sql.bind` and `options.bind` cannot be set at the same time");
        });

        it("reject if `options.replacements` and `options.bind` are both passed", async function () {
            await assert.throws(async () => {
                await this.sequelize.query("select $1 + ? as foo, $2 + ? as bar", { raw: true, bind: [1, 2], replacements: [1, 2] });
            }, "Both `replacements` and `bind` cannot be set at the same time");
        });

        it("reject if `sql.bind` and `sql.values` are both passed", async function () {
            await assert.throws(async () => {
                await this.sequelize.query({ query: "select $1 + ? as foo, $2 + ? as bar", bind: [1, 2], values: [1, 2] }, { raw: true });
            }, "Both `replacements` and `bind` cannot be set at the same time");
        });

        it("reject if `sql.bind` and `options.replacements`` are both passed", async function () {
            await assert.throws(async () => {
                await this.sequelize.query({ query: "select $1 + ? as foo, $2 + ? as bar", bind: [1, 2] }, { raw: true, replacements: [1, 2] });
            }, "Both `replacements` and `bind` cannot be set at the same time");
        });

        it("reject if `options.bind` and `sql.replacements` are both passed", async function () {
            await assert.throws(async () => {
                await this.sequelize.query({ query: "select $1 + ? as foo, $1 _ ? as bar", values: [1, 2] }, { raw: true, bind: [1, 2] });
            }, "Both `replacements` and `bind` cannot be set at the same time");
        });

        it("properly adds and escapes replacement value", function () {
            let logSql;
            const number = 1;
            const date = new Date();
            const string = 't\'e"st';
            const boolean = true;
            const buffer = Buffer.from('t\'e"st');

            date.setMilliseconds(0);
            return this.sequelize.query({
                query: "select ? as number, ? as date,? as string,? as boolean,? as buffer",
                values: [number, date, string, boolean, buffer]
            }, {
                type: this.sequelize.queryType.SELECT,
                logging(s) {
                    logSql = s;
                }
            }).then((result) => {
                const res = result[0] || {};
                res.date = res.date && new Date(res.date);
                res.boolean = res.boolean && true;
                if (is.string(res.buffer) && res.buffer.indexOf("\\x") === 0) {
                    res.buffer = Buffer.from(res.buffer.substring(2), "hex");
                }
                expect(res).to.deep.equal({
                    number,
                    date,
                    string,
                    boolean,
                    buffer
                });
                expect(logSql.indexOf("?")).to.equal(-1);
            });
        });

        it("it allows to pass custom class instances", function () {
            let logSql;
            class SQLStatement {
                constructor() {
                    this.values = [1, 2];
                }

                get query() {
                    return "select ? as foo, ? as bar";
                }
            }
            return this.sequelize.query(new SQLStatement(), { type: this.sequelize.queryType.SELECT, logging: (s) => logSql = s } ).then((result) => {
                expect(result).to.deep.equal([{ foo: 1, bar: 2 }]);
                expect(logSql.indexOf("?")).to.equal(-1);
            });
        });

        it("uses properties `query` and `values` if query is tagged", function () {
            let logSql;
            return this.sequelize.query({ query: "select ? as foo, ? as bar", values: [1, 2] }, { type: this.sequelize.queryType.SELECT, logging(s) {
                logSql = s;
            } }).then((result) => {
                expect(result).to.deep.equal([{ foo: 1, bar: 2 }]);
                expect(logSql.indexOf("?")).to.equal(-1);
            });
        });

        it("uses properties `query` and `bind` if query is tagged", function () {
            const typeCast = dialect === "postgres" ? "::int" : "";
            let logSql;
            return this.sequelize.query({ query: `select $1${typeCast} as foo, $2${typeCast} as bar`, bind: [1, 2] }, { type: this.sequelize.queryType.SELECT, logging(s) {
                logSql = s;
            } }).then((result) => {
                expect(result).to.deep.equal([{ foo: 1, bar: 2 }]);
                if (dialect === "postgres" || dialect === "sqlite") {
                    expect(logSql.indexOf("$1")).to.be.above(-1);
                    expect(logSql.indexOf("$2")).to.be.above(-1);
                } else if (dialect === "mssql") {
                    expect(logSql.indexOf("@0")).to.be.above(-1);
                    expect(logSql.indexOf("@1")).to.be.above(-1);
                }
            });
        });

        it("dot separated attributes when doing a raw query without nest", async function () {
            const tickChar = dialect === "postgres" || dialect === "mssql" ? '"' : "`";
            const sql = `select 1 as ${orm.util.addTicks("foo.bar.baz", tickChar)}`;

            const [res] = await this.sequelize.query(sql, { raw: true, nest: false });

            expect(res).to.be.deep.equal([{ "foo.bar.baz": 1 }]);
        });

        it("destructs dot separated attributes when doing a raw query using nest", function () {
            const tickChar = dialect === "postgres" || dialect === "mssql" ? '"' : "`";
            const sql = `select 1 as ${orm.util.addTicks("foo.bar.baz", tickChar)}`;

            return this.sequelize.query(sql, { raw: true, nest: true }).then((result) => {
                expect(result).to.deep.equal([{ foo: { bar: { baz: 1 } } }]);
            });
        });

        it("replaces token with the passed array", async function () {
            const res = await this.sequelize.query("select ? as foo, ? as bar", { type: this.sequelize.queryType.SELECT, replacements: [1, 2] });
            expect(res).to.deep.equal([{ foo: 1, bar: 2 }]);
        });

        it("replaces named parameters with the passed object", async function () {
            const [res] = await this.sequelize.query("select :one as foo, :two as bar", { raw: true, replacements: { one: 1, two: 2 } });

            expect(res).to.be.deep.equal([{ foo: 1, bar: 2 }]);
        });

        it("replaces named parameters with the passed object and ignore those which does not qualify", async function () {
            const [res] = await this.sequelize.query("select :one as foo, :two as bar, '00:00' as baz", { raw: true, replacements: { one: 1, two: 2 } });
            expect(res).to.be.deep.equal([{ foo: 1, bar: 2, baz: "00:00" }]);
        });

        it("replaces named parameters with the passed object using the same key twice", async function () {
            const [res] = await this.sequelize.query("select :one as foo, :two as bar, :one as baz", { raw: true, replacements: { one: 1, two: 2 } });
            expect(res).to.be.deep.equal([{ foo: 1, bar: 2, baz: 1 }]);
        });

        it("replaces named parameters with the passed object having a null property", async function () {
            const [res] = await this.sequelize.query("select :one as foo, :two as bar", { raw: true, replacements: { one: 1, two: null } });
            expect(res).to.be.deep.equal([{ foo: 1, bar: null }]);
        });

        it("reject when key is missing in the passed object", async function () {
            await assert.throws(async () => {
                await this.sequelize.query("select :one as foo, :two as bar, :three as baz", { raw: true, replacements: { one: 1, two: 2 } });
            }, /Named parameter ":\w+" has no value in the given object\./g);
        });

        it("reject with the passed number", async function () {
            await assert.throws(async () => {
                await this.sequelize.query("select :one as foo, :two as bar", { raw: true, replacements: 2 });
            }, /Named parameter ":\w+" has no value in the given object\./g);
        });

        it("reject with the passed empty object", async function () {
            await assert.throws(async () => {
                await this.sequelize.query("select :one as foo, :two as bar", { raw: true, replacements: {} });
            }, /Named parameter ":\w+" has no value in the given object\./g);
        });

        it("reject with the passed string", async function () {
            await assert.throws(async () => {
                await this.sequelize.query("select :one as foo, :two as bar", { raw: true, replacements: "foobar" });
            }, /Named parameter ":\w+" has no value in the given object\./g);
        });

        it("reject with the passed date", async function () {
            await assert.throws(async () => {
                await this.sequelize.query("select :one as foo, :two as bar", { raw: true, replacements: new Date() });
            }, /Named parameter ":\w+" has no value in the given object\./g);
        });

        it("binds token with the passed array", function () {
            const typeCast = dialect === "postgres" ? "::int" : "";
            let logSql;
            return this.sequelize.query(`select $1${typeCast} as foo, $2${typeCast} as bar`, { type: this.sequelize.queryType.SELECT, bind: [1, 2], logging(s) {
                logSql = s;
            } }).then((result) => {
                expect(result).to.deep.equal([{ foo: 1, bar: 2 }]);
                if (dialect === "postgres" || dialect === "sqlite") {
                    expect(logSql.indexOf("$1")).to.be.above(-1);
                }
            });
        });

        it("binds named parameters with the passed object", function () {
            const typeCast = dialect === "postgres" ? "::int" : "";
            let logSql;
            return this.sequelize.query(`select $one${typeCast} as foo, $two${typeCast} as bar`, { raw: true, bind: { one: 1, two: 2 }, logging(s) {
                logSql = s;
            } }).then((result) => {
                expect(result[0]).to.deep.equal([{ foo: 1, bar: 2 }]);
                if (dialect === "postgres") {
                    expect(logSql.indexOf("$1")).to.be.above(-1);
                }
                if (dialect === "sqlite") {
                    expect(logSql.indexOf("$one")).to.be.above(-1);
                }
            });
        });

        it("binds named parameters with the passed object using the same key twice", function () {
            const typeCast = dialect === "postgres" ? "::int" : "";
            let logSql;
            return this.sequelize.query(`select $one${typeCast} as foo, $two${typeCast} as bar, $one${typeCast} as baz`, { raw: true, bind: { one: 1, two: 2 }, logging(s) {
                logSql = s;
            } }).then((result) => {
                expect(result[0]).to.deep.equal([{ foo: 1, bar: 2, baz: 1 }]);
                if (dialect === "postgres") {
                    expect(logSql.indexOf("$1")).to.be.above(-1);
                    expect(logSql.indexOf("$2")).to.be.above(-1);
                    expect(logSql.indexOf("$3")).to.equal(-1);
                }
            });
        });

        it("binds named parameters with the passed object having a null property", function () {
            const typeCast = dialect === "postgres" ? "::int" : "";
            return this.sequelize.query(`select $one${typeCast} as foo, $two${typeCast} as bar`, { raw: true, bind: { one: 1, two: null } }).then((result) => {
                expect(result[0]).to.deep.equal([{ foo: 1, bar: null }]);
            });
        });

        it("binds named parameters array handles escaped $$", function () {
            const typeCast = dialect === "postgres" ? "::int" : "";
            let logSql;
            return this.sequelize.query(`select $1${typeCast} as foo, '$$ / $$1' as bar`, { raw: true, bind: [1], logging(s) {
                logSql = s;
            } }).then((result) => {
                expect(result[0]).to.deep.equal([{ foo: 1, bar: "$ / $1" }]);
                if (dialect === "postgres" || dialect === "sqlite") {
                    expect(logSql.indexOf("$1")).to.be.above(-1);
                }
            });
        });

        it("binds named parameters object handles escaped $$", function () {
            const typeCast = dialect === "postgres" ? "::int" : "";
            return this.sequelize.query(`select $one${typeCast} as foo, '$$ / $$one' as bar`, { raw: true, bind: { one: 1 } }).then((result) => {
                expect(result[0]).to.deep.equal([{ foo: 1, bar: "$ / $one" }]);
            });
        });

        if (dialect === "postgres" || dialect === "sqlite" || dialect === "mssql") {
            it("does not improperly escape arrays of strings bound to named parameters", function () {
                return this.sequelize.query("select :stringArray as foo", { raw: true, replacements: { stringArray: ['"string"'] } }).then((result) => {
                    expect(result[0]).to.deep.equal([{ foo: '"string"' }]);
                });
            });
        }

        it("reject when binds passed with object and numeric $1 is also present", async function () {
            const typeCast = dialect === "postgres" ? "::int" : "";
            await assert.throws(async () => {
                await this.sequelize.query(`select $one${typeCast} as foo, $two${typeCast} as bar, '$1' as baz`, { raw: true, bind: { one: 1, two: 2 } });
            }, /Named bind parameter "\$\w+" has no value in the given object\./g);
        });

        it("reject when binds passed as array and $alpha is also present", async function () {
            const typeCast = dialect === "postgres" ? "::int" : "";
            await assert.throws(async () => {
                await this.sequelize.query(`select $1${typeCast} as foo, $2${typeCast} as bar, '$foo' as baz`, { raw: true, bind: [1, 2] });
            }, /Named bind parameter "\$\w+" has no value in the given object\./g);
        });

        it("reject when bind key is $0 with the passed array", async function () {
            await assert.throws(async () => {
                await this.sequelize.query("select $1 as foo, $0 as bar, $3 as baz", { raw: true, bind: [1, 2] });
            }, /Named bind parameter "\$\w+" has no value in the given object\./g);
        });

        it("reject when bind key is $01 with the passed array", async function () {
            await assert.throws(async () => {
                await this.sequelize.query("select $1 as foo, $01 as bar, $3 as baz", { raw: true, bind: [1, 2] });
            }, /Named bind parameter "\$\w+" has no value in the given object\./g);
        });

        it("reject when bind key is missing in the passed array", async function () {
            await assert.throws(async () => {
                await this.sequelize.query("select $1 as foo, $2 as bar, $3 as baz", { raw: true, bind: [1, 2] });
            }, /Named bind parameter "\$\w+" has no value in the given object\./g);
        });

        it("reject when bind key is missing in the passed object", async function () {
            await assert.throws(async () => {
                await this.sequelize.query("select $one as foo, $two as bar, $three as baz", { raw: true, bind: { one: 1, two: 2 } });
            }, /Named bind parameter "\$\w+" has no value in the given object\./g);
        });

        it("reject with the passed number for bind", async function () {
            await assert.throws(async () => {
                await this.sequelize.query("select $one as foo, $two as bar", { raw: true, bind: 2 });
            }, /Named bind parameter "\$\w+" has no value in the given object\./g);
        });

        it("reject with the passed empty object for bind", async function () {
            await assert.throws(async () => {
                await this.sequelize.query("select $one as foo, $two as bar", { raw: true, bind: {} });
            }, /Named bind parameter "\$\w+" has no value in the given object\./g);
        });

        it("reject with the passed string for bind", async function () {
            await assert.throws(async () => {
                await this.sequelize.query("select $one as foo, $two as bar", { raw: true, bind: "foobar" });
            }, /Named bind parameter "\$\w+" has no value in the given object\./g);
        });

        it("reject with the passed date for bind", async function () {
            await assert.throws(async () => {
                await this.sequelize.query("select $one as foo, $two as bar", { raw: true, bind: new Date() });
            }, /Named bind parameter "\$\w+" has no value in the given object\./g);
        });

        it("handles AS in conjunction with functions just fine", async function () {
            let datetime = dialect === "sqlite" ? "date('now')" : "NOW()";
            if (dialect === "mssql") {
                datetime = "GETDATE()";
            }

            const [result] = await this.sequelize.query(`SELECT ${datetime} AS t`);
            expect(adone.datetime(result[0].t).isValid()).to.be.true();
        });

        if (this.getTestDialect() === "postgres") {
            it("replaces named parameters with the passed object and ignores casts", async function () {
                const [res] = await this.sequelize.query("select :one as foo, :two as bar, '1000'::integer as baz", { raw: true, replacements: { one: 1, two: 2 } });
                return expect(res).to.deep.equal([{ foo: 1, bar: 2, baz: 1000 }]);
            });

            it("supports WITH queries", async function () {
                const [res] = await this.sequelize.query("WITH RECURSIVE t(n) AS ( VALUES (1) UNION ALL SELECT n+1 FROM t WHERE n < 100) SELECT sum(n) FROM t");
                return expect(res).to.deep.equal([{ sum: "5050" }]);
            });
        }

        if (this.getTestDialect() === "sqlite") {
            it("binds array parameters for upsert are replaced. $$ unescapes only once", function () {
                let logSql;
                return this.sequelize.query("select $1 as foo, $2 as bar, '$$$$' as baz", { type: this.sequelize.queryType.UPSERT, bind: [1, 2], logging(s) {
                    logSql = s;
                } }).then(() => {
                    // sqlite.exec does not return a result
                    expect(logSql.indexOf("$one")).to.equal(-1);
                    expect(logSql.indexOf("'$$'")).to.be.above(-1);
                });
            });

            it("binds named parameters for upsert are replaced. $$ unescapes only once", function () {
                let logSql;
                return this.sequelize.query("select $one as foo, $two as bar, '$$$$' as baz", { type: this.sequelize.queryType.UPSERT, bind: { one: 1, two: 2 }, logging(s) {
                    logSql = s;
                } }).then(() => {
                    // sqlite.exec does not return a result
                    expect(logSql.indexOf("$one")).to.equal(-1);
                    expect(logSql.indexOf("'$$'")).to.be.above(-1);
                });
            });
        }

    });

    describe("set", () => {
        it("should be configurable with global functions", function () {
            const defaultSetterMethod = spy();
            const overrideSetterMethod = spy();
            const defaultGetterMethod = spy();
            const overrideGetterMethod = spy();
            const customSetterMethod = spy();
            const customOverrideSetterMethod = spy();
            const customGetterMethod = spy();
            const customOverrideGetterMethod = spy();

            this.sequelize.options.define = {
                setterMethods: {
                    default: defaultSetterMethod,
                    override: overrideSetterMethod
                },
                getterMethods: {
                    default: defaultGetterMethod,
                    override: overrideGetterMethod
                }
            };
            const testEntity = this.sequelize.define("TestEntity", {}, {
                setterMethods: {
                    custom: customSetterMethod,
                    override: customOverrideSetterMethod
                },
                getterMethods: {
                    custom: customGetterMethod,
                    override: customOverrideGetterMethod
                }
            });

            // Create Instance to test
            const instance = testEntity.build();

            // Call Getters
            instance.default;
            instance.custom;
            instance.override;

            expect(defaultGetterMethod).to.have.been.calledOnce();
            expect(customGetterMethod).to.have.been.calledOnce();
            expect(overrideGetterMethod.callCount).to.be.eql(0);
            expect(customOverrideGetterMethod).to.have.been.calledOnce();

            // Call Setters
            instance.default = "test";
            instance.custom = "test";
            instance.override = "test";

            expect(defaultSetterMethod).to.have.been.calledOnce();
            expect(customSetterMethod).to.have.been.calledOnce();
            expect(overrideSetterMethod.callCount).to.be.eql(0);
            expect(customOverrideSetterMethod).to.have.been.calledOnce();
        });
    });

    if (dialect === "mysql") {
        describe("set", () => {
            it("should return an promised error if transaction isn't defined", function () {
                expect(() => {
                    this.sequelize.set({ foo: "bar" });
                }).to.throw(TypeError, "options.transaction is required");
            });

            it("one value", async function () {
                const t = await this.sequelize.transaction();
                await this.sequelize.set({ foo: "bar" }, { transaction: t });
                const data = await this.sequelize.query("SELECT @foo as `foo`", { plain: true, transaction: t });
                expect(data).to.be.ok();
                expect(data.foo).to.be.equal("bar");
                await t.commit();
            });

            it("multiple values", async function () {
                const t = await this.sequelize.transaction();
                await this.sequelize.set({
                    foo: "bar",
                    foos: "bars"
                }, { transaction: t });
                const data = await this.sequelize.query("SELECT @foo as `foo`, @foos as `foos`", { plain: true, transaction: t });
                expect(data).to.be.ok();
                expect(data.foo).to.be.equal("bar");
                expect(data.foos).to.be.equal("bars");
                await t.commit();
            });
        });
    }

    describe("define", () => {
        it("adds a new dao to the dao manager", function () {
            const count = this.sequelize.modelManager.all.length;
            this.sequelize.define("foo", { title: type.STRING });
            expect(this.sequelize.modelManager.all.length).to.equal(count + 1);
        });

        it("adds a new dao to sequelize.models", function () {
            expect(this.sequelize.models.bar).to.equal(undefined);
            const Bar = this.sequelize.define("bar", { title: type.STRING });
            expect(this.sequelize.models.bar).to.equal(Bar);
        });

        it("overwrites global options", () => {
            const sequelize = this.createSequelizeInstance({ define: { collate: "utf8_general_ci" } });
            const DAO = sequelize.define("foo", { bar: type.STRING }, { collate: "utf8_bin" });
            expect(DAO.options.collate).to.equal("utf8_bin");
        });

        it("overwrites global rowFormat options", () => {
            const sequelize = this.createSequelizeInstance({ define: { rowFormat: "compact" } });
            const DAO = sequelize.define("foo", { bar: type.STRING }, { rowFormat: "default" });
            expect(DAO.options.rowFormat).to.equal("default");
        });

        it("inherits global collate option", () => {
            const sequelize = this.createSequelizeInstance({ define: { collate: "utf8_general_ci" } });
            const DAO = sequelize.define("foo", { bar: type.STRING });
            expect(DAO.options.collate).to.equal("utf8_general_ci");
        });

        it("inherits global rowFormat option", () => {
            const sequelize = this.createSequelizeInstance({ define: { rowFormat: "default" } });
            const DAO = sequelize.define("foo", { bar: type.STRING });
            expect(DAO.options.rowFormat).to.equal("default");
        });

        it("uses the passed tableName", function () {
            const self = this;
            const Photo = this.sequelize.define("Foto", { name: type.STRING }, { tableName: "photos" });
            return Photo.sync({ force: true }).then(() => {
                return self.sequelize.getQueryInterface().showAllTables().then((tableNames) => {
                    if (dialect === "mssql" /* current.dialect.supports.schemas */) {
                        tableNames = _.map(tableNames, "tableName");
                    }
                    expect(tableNames).to.include("photos");
                });
            });
        });
    });

    describe("truncate", () => {
        it("truncates all models", async function () {
            const Project = this.sequelize.define(`project${config.rand()}`, {
                id: {
                    type: type.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                title: type.STRING
            });

            await this.sequelize.sync({ force: true });
            const project = await Project.create({ title: "bla" });
            expect(project).to.exist();
            expect(project.title).to.equal("bla");
            expect(project.id).to.equal(1);
            await this.sequelize.truncate();
            const projects = await Project.findAll({});
            expect(projects).to.exist();
            expect(projects).to.have.length(0);
        });
    });

    describe("sync", () => {
        it("synchronizes all models", function () {
            const Project = this.sequelize.define(`project${config.rand()}`, { title: type.STRING });
            const Task = this.sequelize.define(`task${config.rand()}`, { title: type.STRING });

            return Project.sync({ force: true }).then(() => {
                return Task.sync({ force: true }).then(() => {
                    return Project.create({ title: "bla" }).then(() => {
                        return Task.create({ title: "bla" }).then((task) => {
                            expect(task).to.exist();
                            expect(task.title).to.equal("bla");
                        });
                    });
                });
            });
        });

        it("works with correct database credentials", function () {
            const User = this.sequelize.define("User", { username: type.STRING });
            return User.sync().then(() => {
                expect(true).to.be.true();
            });
        });

        it("fails with incorrect match condition", async function () {
            const sequelize = orm.create("cyber_bird", "user", "pass", {
                dialect: this.sequelize.options.dialect
            });

            sequelize.define("Project", { title: type.STRING });
            sequelize.define("Task", { title: type.STRING });

            await assert.throws(async () => {
                await sequelize.sync({ force: true, match: /$phoenix/ });
            }, 'Database "cyber_bird" does not match sync match parameter "/$phoenix/"');
        });

        if (dialect !== "sqlite") {
            it("fails with incorrect database credentials (1)", function () {
                this.sequelizeWithInvalidCredentials = orm.create("omg", "bar", null, this.sequelize.options);

                const User2 = this.sequelizeWithInvalidCredentials.define("User", { name: type.STRING, bio: type.TEXT });

                return User2.sync().catch((err) => {
                    if (dialect === "postgres" || dialect === "postgres-native") {
                        expect(err.message.trim()).to.match(new RegExp(`(?:${[
                            "fe_sendauth: no password supplied",
                            'role "bar" does not exist',
                            'FATAL:  role "bar" does not exist',
                            'password authentication failed for user "bar"',
                            "no .+ entry for host .+ user \"bar\", database \"omg\""
                        ].join("|")})`));
                    } else if (dialect === "mssql") {
                        expect(err.message).to.equal("Login failed for user 'bar'.");
                    } else {
                        expect(err.message.toString()).to.match(/.*Access denied.*/);
                    }
                });
            });

            it("fails with incorrect database credentials (2)", function () {
                const sequelize = orm.create("db", "user", "pass", {
                    dialect: this.sequelize.options.dialect
                });

                sequelize.define("Project", { title: type.STRING });
                sequelize.define("Task", { title: type.STRING });

                return sequelize.sync({ force: true }).catch((err) => {
                    expect(err).to.be.ok();
                });
            });

            it("fails with incorrect database credentials (3)", function () {
                const sequelize = orm.create("db", "user", "pass", {
                    dialect: this.sequelize.options.dialect,
                    port: 99999
                });

                sequelize.define("Project", { title: type.STRING });
                sequelize.define("Task", { title: type.STRING });

                return sequelize.sync({ force: true }).catch((err) => {
                    expect(err).to.be.ok();
                });
            });

            it("fails with incorrect database credentials (4)", function () {
                const sequelize = orm.create("db", "user", "pass", {
                    dialect: this.sequelize.options.dialect,
                    port: 99999,
                    pool: {}
                });

                sequelize.define("Project", { title: type.STRING });
                sequelize.define("Task", { title: type.STRING });

                return sequelize.sync({ force: true }).catch((err) => {
                    expect(err).to.be.ok();
                });
            });

            it("returns an error correctly if unable to sync a foreign key referenced model", function () {
                this.sequelize.define("Application", {
                    authorID: { type: type.BIGINT, allowNull: false, references: { model: "User", key: "id" } }
                });

                return this.sequelize.sync().catch((error) => {
                    assert.ok(error);
                });
            });

            it("handles self dependant foreign key constraints", function () {
                const block = this.sequelize.define("block", {
                    id: { type: type.INTEGER, primaryKey: true },
                    name: type.STRING
                }, {
                    tableName: "block",
                    timestamps: false,
                    paranoid: false
                });

                block.hasMany(block, {
                    as: "childBlocks",
                    foreignKey: "parent",
                    joinTableName: "link_block_block",
                    useJunctionTable: true,
                    foreignKeyConstraint: true
                });
                block.belongsTo(block, {
                    as: "parentBlocks",
                    foreignKey: "child",
                    joinTableName: "link_block_block",
                    useJunctionTable: true,
                    foreignKeyConstraint: true
                });

                return this.sequelize.sync();
            });

            it("return the sequelize instance after syncing", function () {
                const self = this;
                return this.sequelize.sync().then((sequelize) => {
                    expect(sequelize).to.deep.equal(self.sequelize);
                });
            });

            it("return the single dao after syncing", function () {
                const block = this.sequelize.define("block", {
                    id: { type: type.INTEGER, primaryKey: true },
                    name: type.STRING
                }, {
                    tableName: "block",
                    timestamps: false,
                    paranoid: false
                });

                return block.sync().then((result) => {
                    expect(result).to.deep.equal(block);
                });
            });
        }

        describe("doesn't emit logging when explicitly saying not to", () => {
            afterEach(function () {
                this.sequelize.options.logging = false;
            });

            beforeEach(function () {
                this.spy = spy();
                const self = this;
                this.sequelize.options.logging = function () {
                    self.spy();
                };
                this.User = this.sequelize.define("UserTest", { username: type.STRING });
            });

            it("through Sequelize.sync()", function () {
                const self = this;
                self.spy.reset();
                return this.sequelize.sync({ force: true, logging: false }).then(() => {
                    expect(self.spy.notCalled).to.be.true();
                });
            });

            it("through DAOFactory.sync()", function () {
                const self = this;
                self.spy.reset();
                return this.User.sync({ force: true, logging: false }).then(() => {
                    expect(self.spy.notCalled).to.be.true();
                });
            });
        });

        describe("match", () => {
            it("will return an error not matching", async function () {
                await assert.throws(async () => {
                    await this.sequelize.sync({
                        force: true,
                        match: /alibabaizshaek/
                    });
                });
            });
        });
    });

    describe("drop should work", () => {
        it("correctly succeeds", function () {
            const User = this.sequelize.define("Users", { username: type.STRING });
            return User.sync({ force: true }).then(() => {
                return User.drop();
            });
        });
    });

    describe("import", () => {
        it("imports a dao definition from a file absolute path", function () {
            const Project = this.sequelize.import(`${__dirname}/assets/project`);
            expect(Project).to.exist();
        });

        it("imports a dao definition with a default export", function () {
            const Project = this.sequelize.import(`${__dirname}/assets/es6project`);
            expect(Project).to.exist();
        });

        it("imports a dao definition from a function", function () {
            const Project = this.sequelize.import("Project", (sequelize, DataTypes) => {
                return sequelize.define(`Project${parseInt(Math.random() * 9999999999999999)}`, {
                    name: type.STRING
                });
            });

            expect(Project).to.exist();
        });
    });

    describe("define", () => {
        [
            { type: type.ENUM, values: ["scheduled", "active", "finished"] },
            new type.ENUM("scheduled", "active", "finished")
        ].forEach((status) => {
            describe("enum", () => {
                beforeEach(function () {
                    this.sequelize = this.createSequelizeInstance({
                        typeValidation: true
                    });

                    this.Review = this.sequelize.define("review", { status });
                    return this.Review.sync({ force: true });
                });

                it("raises an error if no values are defined", function () {
                    const self = this;
                    expect(() => {
                        self.sequelize.define("omnomnom", {
                            bla: { type: type.ENUM }
                        });
                    }).to.throw(Error, "Values for ENUM have not been defined.");
                });

                it("correctly stores values", function () {
                    return this.Review.create({ status: "active" }).then((review) => {
                        expect(review.status).to.equal("active");
                    });
                });

                it("correctly loads values", function () {
                    const self = this;
                    return this.Review.create({ status: "active" }).then(() => {
                        return self.Review.findAll().then((reviews) => {
                            expect(reviews[0].status).to.equal("active");
                        });
                    });
                });

                it("doesn't save an instance if value is not in the range of enums", function () {
                    return this.Review.create({ status: "fnord" }).catch((err) => {
                        expect(err).to.be.instanceOf(Error);
                        expect(err.message).to.equal('"fnord" is not a valid choice in ["scheduled","active","finished"]');
                    });
                });
            });
        });

        describe("table", () => {
            [
                { id: { type: type.BIGINT, primaryKey: true } },
                { id: { type: type.STRING, allowNull: true, primaryKey: true } },
                { id: { type: type.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true } }
            ].forEach((customAttributes) => {

                it("should be able to override options on the default attributes", function () {
                    const Picture = this.sequelize.define("picture", _.cloneDeep(customAttributes));
                    return Picture.sync({ force: true }).then(() => {
                        Object.keys(customAttributes).forEach((attribute) => {
                            Object.keys(customAttributes[attribute]).forEach((option) => {
                                const optionValue = customAttributes[attribute][option];
                                if (is.function(optionValue) && new optionValue() instanceof type.ABSTRACT) {
                                    expect(Picture.rawAttributes[attribute][option] instanceof optionValue).to.be.ok();
                                } else {
                                    expect(Picture.rawAttributes[attribute][option]).to.be.equal(optionValue);
                                }
                            });
                        });
                    });
                });

            });
        });

        if (current.dialect.supports.transactions) {
            describe("transaction", () => {
                beforeEach(async function () {
                    const self = this;

                    const sequelize = await this.prepareTransactionTest(this.sequelize);
                    self.sequelizeWithTransaction = sequelize;
                });

                it("is a transaction method available", () => {
                    expect(orm.Sequelize).to.respondTo("transaction");
                });

                it("passes a transaction object to the callback", function () {
                    return this.sequelizeWithTransaction.transaction().then((t) => {
                        expect(t).to.be.instanceOf(Transaction);
                        return t.commit();
                    });
                });

                it("allows me to define a callback on the result", function () {
                    return this.sequelizeWithTransaction.transaction().then((t) => {
                        return t.commit();
                    });
                });

                if (dialect === "sqlite") {
                    it("correctly scopes transaction from other connections", async function () {
                        const TransactionTest = this.sequelizeWithTransaction.define("TransactionTest", { name: type.STRING }, { timestamps: false });
                        const self = this;

                        const count = async (transaction) => {
                            const sql = self.sequelizeWithTransaction.getQueryInterface().QueryGenerator.selectQuery("TransactionTests", { attributes: [["count(*)", "cnt"]] });

                            const result = await self.sequelizeWithTransaction.query(sql, { plain: true, transaction });
                            return result.cnt;
                        };

                        await TransactionTest.sync({ force: true });
                        const t1 = await self.sequelizeWithTransaction.transaction();
                        await self.sequelizeWithTransaction.query(`INSERT INTO ${qq("TransactionTests")} (${qq("name")}) VALUES ('foo');`, { transaction: t1 });
                        expect(await count()).to.be.equal(0);
                        expect(await count(t1)).to.be.equal(1);
                        await t1.commit();
                        expect(await count()).to.be.equal(1);
                    });
                } else {
                    it("correctly handles multiple transactions", async function () {
                        const TransactionTest = this.sequelizeWithTransaction.define("TransactionTest", { name: type.STRING }, { timestamps: false });
                        const self = this;

                        const count = async (transaction) => {
                            const sql = self.sequelizeWithTransaction.getQueryInterface().QueryGenerator.selectQuery("TransactionTests", { attributes: [["count(*)", "cnt"]] });

                            const result = await self.sequelizeWithTransaction.query(sql, { plain: true, transaction });
                            return parseInt(result.cnt, 10);
                        };

                        await TransactionTest.sync({ force: true });
                        const t1 = await self.sequelizeWithTransaction.transaction();
                        await self.sequelizeWithTransaction.query(`INSERT INTO ${qq("TransactionTests")} (${qq("name")}) VALUES ('foo');`, { transaction: t1 });
                        const t2 = await self.sequelizeWithTransaction.transaction();
                        await self.sequelizeWithTransaction.query(`INSERT INTO ${qq("TransactionTests")} (${qq("name")}) VALUES ('bar');`, { transaction: t2 });
                        expect(await count()).to.be.equal(0);
                        expect(await count(t1)).to.be.equal(1);
                        expect(await count(t2)).to.be.equal(1);
                        await t2.rollback();
                        expect(await count()).to.be.equal(0);
                        await t1.commit();
                        expect(await count()).to.be.equal(1);
                    });
                }

                it("supports nested transactions using savepoints", function () {
                    const self = this;
                    const User = this.sequelizeWithTransaction.define("Users", { username: type.STRING });

                    return User.sync({ force: true }).then(() => {
                        return self.sequelizeWithTransaction.transaction().then((t1) => {
                            return User.create({ username: "foo" }, { transaction: t1 }).then((user) => {
                                return self.sequelizeWithTransaction.transaction({ transaction: t1 }).then((t2) => {
                                    return user.updateAttributes({ username: "bar" }, { transaction: t2 }).then(() => {
                                        return t2.commit().then(() => {
                                            return user.reload({ transaction: t1 }).then((newUser) => {
                                                expect(newUser.username).to.equal("bar");
                                                return t1.commit();
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });

                describe("supports rolling back to savepoints", () => {
                    beforeEach(function () {
                        this.User = this.sequelizeWithTransaction.define("user", {});
                        return this.sequelizeWithTransaction.sync({ force: true });
                    });

                    it("rolls back to the first savepoint, undoing everything", async function () {
                        const transaction = await this.sequelizeWithTransaction.transaction();
                        const sp1 = await this.sequelizeWithTransaction.transaction({ transaction });
                        await this.User.create({}, { transaction });
                        const sp2 = await this.sequelizeWithTransaction.transaction({ transaction });
                        await this.User.create({}, { transaction });
                        {
                            const users = await this.User.findAll({ transaction });
                            expect(users).to.have.length(2);
                        }
                        await sp1.rollback();
                        {
                            const users = await this.User.findAll({ transaction });
                            expect(users).to.have.length(0);
                        }
                        await transaction.rollback();
                    });

                    it("rolls back to the most recent savepoint, only undoing recent changes", async function () {
                        const transaction = await this.sequelizeWithTransaction.transaction();
                        const sp1 = await this.sequelizeWithTransaction.transaction({ transaction });
                        await this.User.create({}, { transaction });
                        const sp2 = await this.sequelizeWithTransaction.transaction({ transaction });
                        await this.User.create({}, { transaction });
                        {
                            const users = await this.User.findAll({ transaction });
                            expect(users).to.have.length(2);
                        }
                        await sp2.rollback();
                        {
                            const users = await this.User.findAll({ transaction });
                            expect(users).to.have.length(1);
                        }
                        await transaction.rollback();
                    });
                });

                it("supports rolling back a nested transaction", function () {
                    const self = this;
                    const User = this.sequelizeWithTransaction.define("Users", { username: type.STRING });

                    return User.sync({ force: true }).then(() => {
                        return self.sequelizeWithTransaction.transaction().then((t1) => {
                            return User.create({ username: "foo" }, { transaction: t1 }).then((user) => {
                                return self.sequelizeWithTransaction.transaction({ transaction: t1 }).then((t2) => {
                                    return user.updateAttributes({ username: "bar" }, { transaction: t2 }).then(() => {
                                        return t2.rollback().then(() => {
                                            return user.reload({ transaction: t1 }).then((newUser) => {
                                                expect(newUser.username).to.equal("foo");
                                                return t1.commit();
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });

                it("supports rolling back outermost transaction", function () {
                    const self = this;
                    const User = this.sequelizeWithTransaction.define("Users", { username: type.STRING });

                    return User.sync({ force: true }).then(() => {
                        return self.sequelizeWithTransaction.transaction().then((t1) => {
                            return User.create({ username: "foo" }, { transaction: t1 }).then((user) => {
                                return self.sequelizeWithTransaction.transaction({ transaction: t1 }).then((t2) => {
                                    return user.updateAttributes({ username: "bar" }, { transaction: t2 }).then(() => {
                                        return t1.rollback().then(() => {
                                            return User.findAll().then((users) => {
                                                expect(users.length).to.equal(0);
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        }
    });

    describe("databaseVersion", () => {
        it("should database/dialect version", function () {
            return this.sequelize.databaseVersion().then((version) => {
                expect(typeof version).to.equal("string");
                expect(version).to.be.ok();
            });
        });
    });

    describe("paranoid deletedAt non-null default value", () => {
        it("should use defaultValue of deletedAt in paranoid clause and restore", async function () {
            const epochObj = new Date(0);
            const epoch = Number(epochObj);
            const User = this.sequelize.define("user", {
                username: type.STRING,
                deletedAt: {
                    type: type.DATE,
                    defaultValue: epochObj
                }
            }, {
                paranoid: true
            });

            await this.sequelize.sync({ force: true });
            {
                const user = await User.create({ username: "user1" });
                expect(Number(user.deletedAt)).to.equal(epoch);
            }
            const user = await User.findOne({
                where: {
                    username: "user1"
                }
            });
            expect(user).to.exist();
            expect(Number(user.deletedAt)).to.equal(epoch);

            const destroyedUser = await user.destroy();
            expect(destroyedUser.deletedAt).to.exist();
            expect(Number(destroyedUser.deletedAt)).not.to.equal(epoch);

            const fetchedDestroyedUser = await User.findById(destroyedUser.id, { paranoid: false });
            expect(fetchedDestroyedUser.deletedAt).to.exist();
            expect(Number(fetchedDestroyedUser.deletedAt)).not.to.equal(epoch);

            const restoredUser = await fetchedDestroyedUser.restore();

            expect(Number(restoredUser.deletedAt)).to.equal(epoch);
            await User.destroy({
                where: {
                    username: "user1"
                }
            });
            expect(await User.count()).to.be.equal(0);
            await User.restore();

            const nonDeletedUsers = await User.findAll();
            expect(nonDeletedUsers.length).to.equal(1);
            nonDeletedUsers.forEach((u) => {
                expect(Number(u.deletedAt)).to.equal(epoch);
            });
        });
    });
});
