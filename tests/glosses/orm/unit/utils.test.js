import Support from "../support";

const {
    orm: {
        DataTypes,
        Utils
    }
} = adone;

const tedious = require("tedious");
const tediousIsolationLevel = tedious.ISOLATION_LEVEL;

describe(Support.getTestDialectTeaser("Utils"), () => {
    describe("merge", () => {
        it("does not clone sequelize models", () => {
            const User = Support.sequelize.define("user");
            const merged = Utils.merge({}, { include: [{ model: User }] });
            const merged2 = Utils.merge({}, { user: User });

            expect(merged.include[0].model).to.equal(User);
            expect(merged2.user).to.equal(User);
        });
    });

    describe("toDefaultValue", () => {
        it("return plain data types", () => {
            expect(Utils.toDefaultValue(DataTypes.UUIDV4)).to.equal("UUIDV4");
        });
        it("return uuid v1", () => {
            expect(/^[a-z0-9-]{36}$/.test(Utils.toDefaultValue(new DataTypes.UUIDV1()))).to.be.equal(true);
        });
        it("return uuid v4", () => {
            expect(/^[a-z0-9-]{36}/.test(Utils.toDefaultValue(new DataTypes.UUIDV4()))).to.be.equal(true);
        });
        it("return now", () => {
            expect(Object.prototype.toString.call(Utils.toDefaultValue(new DataTypes.NOW()))).to.be.equal("[object Date]");
        });
        it("return plain string", () => {
            expect(Utils.toDefaultValue("Test")).to.equal("Test");
        });
        it("return plain object", () => {
            assert.deepEqual({}, Utils.toDefaultValue({}));
        });
    });

    describe("mapFinderOptions", () => {
        it("virtual attribute dependencies", () => {
            expect(Utils.mapFinderOptions({
                attributes: [
                    "active"
                ]
            }, Support.sequelize.define("User", {
                createdAt: {
                    type: DataTypes.DATE,
                    field: "created_at"
                },
                active: {
                    type: new DataTypes.VIRTUAL(DataTypes.BOOLEAN, ["createdAt"])
                }
            })).attributes).to.eql([
                [
                    "created_at",
                    "createdAt"
                ]
            ]);
        });

        it("multiple calls", () => {
            const Model = Support.sequelize.define("User", {
                createdAt: {
                    type: DataTypes.DATE,
                    field: "created_at"
                },
                active: {
                    type: new DataTypes.VIRTUAL(DataTypes.BOOLEAN, ["createdAt"])
                }
            });

            expect(
                Utils.mapFinderOptions(
                    Utils.mapFinderOptions({
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
            expect(Utils.mapOptionFieldNames({
                where: {
                    firstName: "Paul",
                    lastName: "Atreides"
                }
            }, Support.sequelize.define("User", {
                firstName: {
                    type: DataTypes.STRING,
                    field: "first_name"
                },
                lastName: {
                    type: DataTypes.STRING,
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
            expect(Utils.mapOptionFieldNames({
                where: {
                    $or: {
                        firstName: "Paul",
                        lastName: "Atreides"
                    }
                }
            }, Support.sequelize.define("User", {
                firstName: {
                    type: DataTypes.STRING,
                    field: "first_name"
                },
                lastName: {
                    type: DataTypes.STRING,
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
            expect(Utils.mapOptionFieldNames({
                where: {
                    $or: [
                        { firstName: "Paul" },
                        { lastName: "Atreides" }
                    ]
                }
            }, Support.sequelize.define("User", {
                firstName: {
                    type: DataTypes.STRING,
                    field: "first_name"
                },
                lastName: {
                    type: DataTypes.STRING,
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
            expect(Utils.mapOptionFieldNames({
                where: {
                    $and: {
                        firstName: "Paul",
                        lastName: "Atreides"
                    }
                }
            }, Support.sequelize.define("User", {
                firstName: {
                    type: DataTypes.STRING,
                    field: "first_name"
                },
                lastName: {
                    type: DataTypes.STRING,
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
                return Utils.stack();
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
        const sql = Support.sequelize;
        const generator = sql.queryInterface.QueryGenerator;
        const run = generator.handleSequelizeMethod.bind(generator);
        const expectsql = Support.expectsql;

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
        const logger = Utils.getLogger();

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

    if (Support.getTestDialect() === "mssql") {
        describe("mapIsolationLevelStringToTedious", () => {
            it("READ_UNCOMMITTED", () => {
                expect(Utils.mapIsolationLevelStringToTedious("READ_UNCOMMITTED", tedious)).to.equal(tediousIsolationLevel.READ_UNCOMMITTED);
            });

            it("READ_COMMITTED", () => {
                expect(Utils.mapIsolationLevelStringToTedious("READ_COMMITTED", tedious)).to.equal(tediousIsolationLevel.READ_COMMITTED);
            });

            it("REPEATABLE_READ", () => {
                expect(Utils.mapIsolationLevelStringToTedious("REPEATABLE_READ", tedious)).to.equal(tediousIsolationLevel.REPEATABLE_READ);
            });

            it("SERIALIZABLE", () => {
                expect(Utils.mapIsolationLevelStringToTedious("SERIALIZABLE", tedious)).to.equal(tediousIsolationLevel.SERIALIZABLE);
            });

            it("SNAPSHOT", () => {
                expect(Utils.mapIsolationLevelStringToTedious("SNAPSHOT", tedious)).to.equal(tediousIsolationLevel.SNAPSHOT);
            });

            it("should throw error if tedious lib is not passed as a parameter", () => {
                expect(Utils.mapIsolationLevelStringToTedious.bind(Utils, "SNAPSHOT")).to.throw("An instance of tedious lib should be passed to this function");
            });
        });
    }
});
