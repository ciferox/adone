describe("utils", function () {
    const { orm } = adone;
    const { type } = orm;

    const tedious = require("tedious");
    const tediousIsolationLevel = tedious.ISOLATION_LEVEL;

    describe("merge", () => {
        it("does not clone sequelize models", () => {
            const User = this.sequelize.define("user");
            const merged = orm.util.merge({}, { include: [{ model: User }] });
            const merged2 = orm.util.merge({}, { user: User });

            expect(merged.include[0].model).to.equal(User);
            expect(merged2.user).to.equal(User);
        });
    });

    describe("toDefaultValue", () => {
        it("return plain data types", () => {
            expect(orm.util.toDefaultValue(type.UUIDV4)).to.equal("UUIDV4");
        });
        it("return uuid v1", () => {
            expect(/^[a-z0-9-]{36}$/.test(orm.util.toDefaultValue(new type.UUIDV1()))).to.be.equal(true);
        });
        it("return uuid v4", () => {
            expect(/^[a-z0-9-]{36}/.test(orm.util.toDefaultValue(new type.UUIDV4()))).to.be.equal(true);
        });
        it("return now", () => {
            expect(Object.prototype.toString.call(orm.util.toDefaultValue(new type.NOW()))).to.be.equal("[object Date]");
        });
        it("return plain string", () => {
            expect(orm.util.toDefaultValue("Test")).to.equal("Test");
        });
        it("return plain object", () => {
            assert.deepEqual({}, orm.util.toDefaultValue({}));
        });
    });

    describe("mapFinderOptions", () => {
        it("virtual attribute dependencies", () => {
            expect(orm.util.mapFinderOptions({
                attributes: [
                    "active"
                ]
            }, this.sequelize.define("User", {
                createdAt: {
                    type: type.DATE,
                    field: "created_at"
                },
                active: {
                    type: new type.VIRTUAL(type.BOOLEAN, ["createdAt"])
                }
            })).attributes).to.eql([
                [
                    "created_at",
                    "createdAt"
                ]
            ]);
        });

        it("multiple calls", () => {
            const Model = this.sequelize.define("User", {
                createdAt: {
                    type: type.DATE,
                    field: "created_at"
                },
                active: {
                    type: new type.VIRTUAL(type.BOOLEAN, ["createdAt"])
                }
            });

            expect(
                orm.util.mapFinderOptions(
                    orm.util.mapFinderOptions({
                        attributes: [
                            "active"
                        ]
                    }, Model),
                    Model
                ).attributes
            ).to.eql([
                [
                    "created_at",
                    "createdAt"
                ]
            ]);
        });
    });

    describe("mapOptionFieldNames", () => {
        it("plain where", () => {
            expect(orm.util.mapOptionFieldNames({
                where: {
                    firstName: "Paul",
                    lastName: "Atreides"
                }
            }, this.sequelize.define("User", {
                firstName: {
                    type: type.STRING,
                    field: "first_name"
                },
                lastName: {
                    type: type.STRING,
                    field: "last_name"
                }
            }))).to.eql({
                where: {
                    first_name: "Paul",
                    last_name: "Atreides"
                }
            });
        });

        it("$or where", () => {
            expect(orm.util.mapOptionFieldNames({
                where: {
                    $or: {
                        firstName: "Paul",
                        lastName: "Atreides"
                    }
                }
            }, this.sequelize.define("User", {
                firstName: {
                    type: type.STRING,
                    field: "first_name"
                },
                lastName: {
                    type: type.STRING,
                    field: "last_name"
                }
            }))).to.eql({
                where: {
                    $or: {
                        first_name: "Paul",
                        last_name: "Atreides"
                    }
                }
            });
        });

        it("$or[] where", () => {
            expect(orm.util.mapOptionFieldNames({
                where: {
                    $or: [
                        { firstName: "Paul" },
                        { lastName: "Atreides" }
                    ]
                }
            }, this.sequelize.define("User", {
                firstName: {
                    type: type.STRING,
                    field: "first_name"
                },
                lastName: {
                    type: type.STRING,
                    field: "last_name"
                }
            }))).to.eql({
                where: {
                    $or: [
                        { first_name: "Paul" },
                        { last_name: "Atreides" }
                    ]
                }
            });
        });

        it("$and where", () => {
            expect(orm.util.mapOptionFieldNames({
                where: {
                    $and: {
                        firstName: "Paul",
                        lastName: "Atreides"
                    }
                }
            }, this.sequelize.define("User", {
                firstName: {
                    type: type.STRING,
                    field: "first_name"
                },
                lastName: {
                    type: type.STRING,
                    field: "last_name"
                }
            }))).to.eql({
                where: {
                    $and: {
                        first_name: "Paul",
                        last_name: "Atreides"
                    }
                }
            });
        });
    });

    describe("stack", () => {
        it('stack trace starts after call to Util.stack()', function this_here_test() { // eslint-disable-line
            // We need a named function to be able to capture its trace
            const c = function () {
                return orm.util.stack();
            };

            const b = function () {
                return c();
            };

            const a = function () {
                return b();
            };

            const stack = a();

            expect(stack[0].getFunctionName()).to.eql("c");
            expect(stack[1].getFunctionName()).to.eql("b");
            expect(stack[2].getFunctionName()).to.eql("a");
            expect(stack[3].getFunctionName()).to.eql("this_here_test");
        });
    });

    describe("Sequelize.cast", () => {
        const sql = this.sequelize;
        const generator = sql.queryInterface.QueryGenerator;
        const run = generator.handleSequelizeMethod.bind(generator);
        const expectsql = this.expectsql.bind(this);

        it("accepts condition object (auto casting)", () => {
            expectsql(run(sql.fn("SUM", sql.cast({
                $or: {
                    foo: "foo",
                    bar: "bar"
                }
            }, "int"))), {
                default: "SUM(CAST(([foo] = 'foo' OR [bar] = 'bar') AS INT))",
                mssql: "SUM(CAST(([foo] = N'foo' OR [bar] = N'bar') AS INT))"
            });
        });
    });

    describe("Logger", () => {
        const logger = orm.util.getLogger();

        it("deprecate", () => {
            expect(logger.deprecate).to.be.a("function");
            logger.deprecate("test deprecation");
        });

        it("debug", () => {
            expect(logger.debug).to.be.a("function");
            logger.debug("test debug");
        });

        it("warn", () => {
            expect(logger.warn).to.be.a("function");
            logger.warn("test warning");
        });

        it.skip("debugContext", () => {
            expect(logger.debugContext).to.be.a("function");
            const testLogger = logger.debugContext("test");

            expect(testLogger).to.be.a("function");
            expect(testLogger.namespace).to.be.eql("sequelize:test");
        });
    });

    if (this.getTestDialect() === "mssql") {
        describe("mapIsolationLevelStringToTedious", () => {
            it("READ_UNCOMMITTED", () => {
                expect(orm.util.mapIsolationLevelStringToTedious("READ_UNCOMMITTED", tedious)).to.equal(tediousIsolationLevel.READ_UNCOMMITTED);
            });

            it("READ_COMMITTED", () => {
                expect(orm.util.mapIsolationLevelStringToTedious("READ_COMMITTED", tedious)).to.equal(tediousIsolationLevel.READ_COMMITTED);
            });

            it("REPEATABLE_READ", () => {
                expect(orm.util.mapIsolationLevelStringToTedious("REPEATABLE_READ", tedious)).to.equal(tediousIsolationLevel.REPEATABLE_READ);
            });

            it("SERIALIZABLE", () => {
                expect(orm.util.mapIsolationLevelStringToTedious("SERIALIZABLE", tedious)).to.equal(tediousIsolationLevel.SERIALIZABLE);
            });

            it("SNAPSHOT", () => {
                expect(orm.util.mapIsolationLevelStringToTedious("SNAPSHOT", tedious)).to.equal(tediousIsolationLevel.SNAPSHOT);
            });

            it("should throw error if tedious lib is not passed as a parameter", () => {
                expect(orm.util.mapIsolationLevelStringToTedious("SNAPSHOT")).to.throw("An instance of tedious lib should be passed to this function");
            });
        });
    }
});
