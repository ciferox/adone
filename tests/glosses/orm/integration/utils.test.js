import Support from "./support";

const { orm } = adone;
const { type } = orm;

describe(Support.getTestDialectTeaser("Utils"), () => {
    describe("removeCommentsFromFunctionString", () => {
        it("removes line comments at the start of a line", () => {
            const functionWithLineComments = function () {
                // noot noot
            };

            const string = functionWithLineComments.toString();
            const result = orm.util.removeCommentsFromFunctionString(string);

            expect(result).not.to.match(/.*noot.*/);
        });

        it("removes lines comments in the middle of a line", () => {
            const functionWithLineComments = function () {
                console.log(1); // noot noot
            };

            const string = functionWithLineComments.toString();
            const result = orm.util.removeCommentsFromFunctionString(string);

            expect(result).not.to.match(/.*noot.*/);
        });

        it("removes range comments", () => {
            const s = function () {
                console.log(1); /*
          noot noot
        */
                console.log(2); /*
          foo
        */
            }.toString();

            const result = orm.util.removeCommentsFromFunctionString(s);

            expect(result).not.to.match(/.*noot.*/);
            expect(result).not.to.match(/.*foo.*/);
            expect(result).to.match(/.*console.log\(2\).*/);
        });
    });

    describe("argsArePrimaryKeys", () => {
        it("doesn't detect primary keys if primareyKeys and values have different lengths", () => {
            expect(orm.util.argsArePrimaryKeys([1, 2, 3], [1])).to.be.false();
        });

        it("doesn't detect primary keys if primary keys are hashes or arrays", () => {
            expect(orm.util.argsArePrimaryKeys([[]], [1])).to.be.false();
        });

        it("detects primary keys if length is correct and data types are matching", () => {
            expect(orm.util.argsArePrimaryKeys([1, 2, 3], ["INTEGER", "INTEGER", "INTEGER"])).to.be.true();
        });

        it("detects primary keys if primary keys are dates and lengths are matching", () => {
            expect(orm.util.argsArePrimaryKeys([new Date()], ["foo"])).to.be.true();
        });
    });

    describe("underscore", () => {
        describe("underscoredIf", () => {
            it("is defined", () => {
                expect(orm.util.underscoredIf).to.be.ok();
            });

            it("underscores if second param is true", () => {
                expect(orm.util.underscoredIf("fooBar", true)).to.equal("foo_bar");
            });

            it("doesn't underscore if second param is false", () => {
                expect(orm.util.underscoredIf("fooBar", false)).to.equal("fooBar");
            });
        });

        describe("camelizeIf", () => {
            it("is defined", () => {
                expect(orm.util.camelizeIf).to.be.ok();
            });

            it("camelizes if second param is true", () => {
                expect(orm.util.camelizeIf("foo_bar", true)).to.equal("fooBar");
            });

            it("doesn't camelize if second param is false", () => {
                expect(orm.util.underscoredIf("fooBar", true)).to.equal("foo_bar");
            });
        });
    });

    describe("format", () => {
        it("should format where clause correctly when the value is truthy", () => {
            const where = ["foo = ?", 1];
            expect(orm.util.format(where)).to.equal("foo = 1");
        });

        it("should format where clause correctly when the value is false", () => {
            const where = ["foo = ?", 0];
            expect(orm.util.format(where)).to.equal("foo = 0");
        });
    });

    describe("cloneDeep", () => {
        it("should clone objects", () => {
            const obj = { foo: 1 };
            const clone = orm.util.cloneDeep(obj);

            expect(obj).to.not.equal(clone);
        });

        it("should clone nested objects", () => {
            const obj = { foo: { bar: 1 } };
            const clone = orm.util.cloneDeep(obj);

            expect(obj.foo).to.not.equal(clone.foo);
        });

        it("should not call clone methods on plain objects", () => {
            expect(() => {
                orm.util.cloneDeep({
                    clone() {
                        throw new Error("clone method called");
                    }
                });
            }).to.not.throw();
        });

        it("should not call clone methods on arrays", () => {
            expect(() => {
                const arr = [];
                arr.clone = function () {
                    throw new Error("clone method called");
                };

                orm.util.cloneDeep(arr);
            }).to.not.throw();
        });
    });

    describe("validateParameter", () => {
        describe("method signature", () => {
            it("throws an error if the value is not defined", () => {
                expect(() => {
                    orm.util.validateParameter();
                }).to.throw("No value has been passed.");
            });

            it("does not throw an error if the value is not defined and the parameter is optional", () => {
                expect(() => {
                    orm.util.validateParameter(undefined, Object, { optional: true });
                }).to.not.throw();
            });

            it("throws an error if the expectation is not defined", () => {
                expect(() => {
                    orm.util.validateParameter(1);
                }).to.throw("No expectation has been passed.");
            });
        });

        describe("expectation", () => {
            it("uses the instanceof method if the expectation is a class", () => {
                expect(orm.util.validateParameter(new Number(1), Number)).to.be.true();
            });
        });

        describe("failing expectations", () => {
            it("throws an error if the expectation does not match", () => {
                expect(() => {
                    orm.util.validateParameter(1, String);
                }).to.throw(/The parameter.*is no.*/);
            });
        });
    });

    if (Support.getTestDialect() === "postgres") {
        describe("json", () => {
            const {
                dialect: {
                    postgres: { QueryGenerator }
                }
            } = adone.private(orm);

            it("successfully parses a complex nested condition hash", () => {
                const conditions = {
                    metadata: {
                        language: "icelandic",
                        pg_rating: { dk: "G" }
                    },
                    another_json_field: { x: 1 }
                };
                const expected = '("metadata"#>>\'{language}\') = \'icelandic\' AND ("metadata"#>>\'{pg_rating,dk}\') = \'G\' AND ("another_json_field"#>>\'{x}\') = \'1\'';
                expect(QueryGenerator.handleSequelizeMethod(new orm.util.Json(conditions))).to.deep.equal(expected);
            });

            it("successfully parses a string using dot notation", () => {
                const path = "metadata.pg_rating.dk";
                expect(QueryGenerator.handleSequelizeMethod(new orm.util.Json(path))).to.equal('("metadata"#>>\'{pg_rating,dk}\')');
            });

            it("allows postgres json syntax", () => {
                const path = "metadata->pg_rating->>dk";
                expect(QueryGenerator.handleSequelizeMethod(new orm.util.Json(path))).to.equal(path);
            });

            it("can take a value to compare against", () => {
                const path = "metadata.pg_rating.is";
                const value = "U";
                expect(QueryGenerator.handleSequelizeMethod(new orm.util.Json(path, value))).to.equal('("metadata"#>>\'{pg_rating,is}\') = \'U\'');
            });
        });
    }

    describe("inflection", () => {
        it("works better than lingo ;)", () => {
            expect(orm.util.pluralize("buy")).to.equal("buys");
            expect(orm.util.pluralize("holiday")).to.equal("holidays");
            expect(orm.util.pluralize("days")).to.equal("days");
            expect(orm.util.pluralize("status")).to.equal("statuses");

            expect(orm.util.singularize("status")).to.equal("status");
        });
    });

    describe("Sequelize.fn", () => {
        let Airplane;

        beforeEach(function () {
            Airplane = this.sequelize.define("Airplane", {
                wings: type.INTEGER,
                engines: type.INTEGER
            });

            return Airplane.sync({ force: true }).then(() => {
                return Airplane.bulkCreate([
                    {
                        wings: 2,
                        engines: 0
                    }, {
                        wings: 4,
                        engines: 1
                    }, {
                        wings: 2,
                        engines: 2
                    }
                ]);
            });
        });

        if (Support.getTestDialect() !== "mssql") {
            it("accepts condition object (with cast)", async function () {
                const type = Support.getTestDialect() === "mysql" ? "unsigned" : "int";

                const [airplane] = await Airplane.findAll({
                    attributes: [
                        [this.sequelize.fn("COUNT", "*"), "count"],
                        [orm.util.fn("SUM", orm.util.cast({
                            engines: 1
                        }, type)), "count-engines"],
                        [orm.util.fn("SUM", orm.util.cast({
                            $or: {
                                engines: {
                                    $gt: 1
                                },
                                wings: 4
                            }
                        }, type)), "count-engines-wings"]
                    ]
                });
                expect(parseInt(airplane.get("count"))).to.equal(3);
                expect(parseInt(airplane.get("count-engines"))).to.equal(1);
                expect(parseInt(airplane.get("count-engines-wings"))).to.equal(2);
            });
        }

        if (Support.getTestDialect() !== "mssql" && Support.getTestDialect() !== "postgres") {
            it("accepts condition object (auto casting)", async function () {
                const [airplane] = await Airplane.findAll({
                    attributes: [
                        [this.sequelize.fn("COUNT", "*"), "count"],
                        [orm.util.fn("SUM", {
                            engines: 1
                        }), "count-engines"],
                        [orm.util.fn("SUM", {
                            $or: {
                                engines: {
                                    $gt: 1
                                },
                                wings: 4
                            }
                        }), "count-engines-wings"]
                    ]
                });
                expect(parseInt(airplane.get("count"))).to.equal(3);
                expect(parseInt(airplane.get("count-engines"))).to.equal(1);
                expect(parseInt(airplane.get("count-engines-wings"))).to.equal(2);
            });
        }
    });
});
