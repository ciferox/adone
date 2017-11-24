import Support from "../../support";

const {
    DataTypes
} = adone.orm;

const Sequelize = Support.Sequelize;
const util = require("util");
const expectsql = Support.expectsql;
const current = Support.sequelize;

// Notice: [] will be replaced by dialect specific tick/quote character when there is not dialect specific expectation but only a default expectation

describe(Support.getTestDialectTeaser("SQL"), () => {
    describe("DataTypes", () => {
        const testsql = function (description, dataType, expectation) {
            it(description, () => {
                return expectsql(current.normalizeDataType(dataType).toSql(), expectation);
            });
        };

        describe("STRING", () => {
            testsql("STRING", DataTypes.STRING, {
                default: "VARCHAR(255)",
                mssql: "NVARCHAR(255)"
            });

            testsql("STRING(1234)", new DataTypes.STRING(1234), {
                default: "VARCHAR(1234)",
                mssql: "NVARCHAR(1234)"
            });

            testsql("STRING({ length: 1234 })", new DataTypes.STRING({ length: 1234 }), {
                default: "VARCHAR(1234)",
                mssql: "NVARCHAR(1234)"
            });

            testsql("STRING(1234).BINARY", new DataTypes.STRING(1234).BINARY, {
                default: "VARCHAR(1234) BINARY",
                sqlite: "VARCHAR BINARY(1234)",
                mssql: "BINARY(1234)",
                postgres: "BYTEA"
            });

            testsql("STRING.BINARY", DataTypes.STRING.BINARY, {
                default: "VARCHAR(255) BINARY",
                sqlite: "VARCHAR BINARY(255)",
                mssql: "BINARY(255)",
                postgres: "BYTEA"
            });

            describe("validate", () => {
                it("should return `true` if `value` is a string", () => {
                    const type = new DataTypes.STRING();

                    expect(type.validate("foobar")).to.equal(true);
                    expect(type.validate(new String("foobar"))).to.equal(true);
                    expect(type.validate(12)).to.equal(true);
                });
            });
        });

        describe("TEXT", () => {
            testsql("TEXT", DataTypes.TEXT, {
                default: "TEXT",
                mssql: "NVARCHAR(MAX)" // in mssql text is actually representing a non unicode text field
            });

            testsql('TEXT("tiny")', new DataTypes.TEXT("tiny"), {
                default: "TEXT",
                mssql: "NVARCHAR(256)",
                mysql: "TINYTEXT"
            });

            testsql('TEXT({ length: "tiny" })', new DataTypes.TEXT({ length: "tiny" }), {
                default: "TEXT",
                mssql: "NVARCHAR(256)",
                mysql: "TINYTEXT"
            });

            testsql('TEXT("medium")', new DataTypes.TEXT("medium"), {
                default: "TEXT",
                mssql: "NVARCHAR(MAX)",
                mysql: "MEDIUMTEXT"
            });

            testsql('TEXT("long")', new DataTypes.TEXT("long"), {
                default: "TEXT",
                mssql: "NVARCHAR(MAX)",
                mysql: "LONGTEXT"
            });

            describe("validate", () => {
                it("should throw an error if `value` is invalid", () => {
                    const type = new DataTypes.TEXT();

                    expect(() => {
                        type.validate(12345);
                    }).to.throw(Sequelize.ValidationError, "12345 is not a valid string");
                });

                it("should return `true` if `value` is a string", () => {
                    const type = new DataTypes.TEXT();

                    expect(type.validate("foobar")).to.equal(true);
                });
            });
        });

        describe("CHAR", () => {
            testsql("CHAR", DataTypes.CHAR, {
                default: "CHAR(255)"
            });

            testsql("CHAR(12)", new DataTypes.CHAR(12), {
                default: "CHAR(12)"
            });

            testsql("CHAR({ length: 12 })", new DataTypes.CHAR({ length: 12 }), {
                default: "CHAR(12)"
            });

            testsql("CHAR(12).BINARY", new DataTypes.CHAR(12).BINARY, {
                default: "CHAR(12) BINARY",
                sqlite: "CHAR BINARY(12)",
                postgres: "BYTEA"
            });

            testsql("CHAR.BINARY", DataTypes.CHAR.BINARY, {
                default: "CHAR(255) BINARY",
                sqlite: "CHAR BINARY(255)",
                postgres: "BYTEA"
            });
        });

        describe("BOOLEAN", () => {
            testsql("BOOLEAN", DataTypes.BOOLEAN, {
                postgres: "BOOLEAN",
                mssql: "BIT",
                mysql: "TINYINT(1)",
                sqlite: "TINYINT(1)"
            });

            describe("validate", () => {
                it("should throw an error if `value` is invalid", () => {
                    const type = new DataTypes.BOOLEAN();

                    expect(() => {
                        type.validate(12345);
                    }).to.throw(Sequelize.ValidationError, "12345 is not a valid boolean");
                });

                it("should return `true` if `value` is a boolean", () => {
                    const type = new DataTypes.BOOLEAN();

                    expect(type.validate(true)).to.equal(true);
                    expect(type.validate(false)).to.equal(true);
                    expect(type.validate("1")).to.equal(true);
                    expect(type.validate("0")).to.equal(true);
                    expect(type.validate("true")).to.equal(true);
                    expect(type.validate("false")).to.equal(true);
                });
            });
        });

        describe("DATE", () => {
            testsql("DATE", DataTypes.DATE, {
                postgres: "TIMESTAMP WITH TIME ZONE",
                mssql: "DATETIMEOFFSET",
                mysql: "DATETIME",
                sqlite: "DATETIME"
            });

            testsql("DATE(6)", new DataTypes.DATE(6), {
                postgres: "TIMESTAMP WITH TIME ZONE",
                mssql: "DATETIMEOFFSET",
                mysql: "DATETIME(6)",
                sqlite: "DATETIME"
            });

            describe("validate", () => {
                it("should throw an error if `value` is invalid", () => {
                    const type = new DataTypes.DATE();

                    expect(() => {
                        type.validate("foobar");
                    }).to.throw(Sequelize.ValidationError, '"foobar" is not a valid date');
                });

                it("should return `true` if `value` is a date", () => {
                    const type = new DataTypes.DATE();

                    expect(type.validate(new Date())).to.equal(true);
                });
            });
        });

        if (current.dialect.supports.HSTORE) {
            describe("HSTORE", () => {
                describe("validate", () => {
                    it("should throw an error if `value` is invalid", () => {
                        const type = new DataTypes.HSTORE();

                        expect(() => {
                            type.validate("foobar");
                        }).to.throw(Sequelize.ValidationError, '"foobar" is not a valid hstore');
                    });

                    it("should return `true` if `value` is an hstore", () => {
                        const type = new DataTypes.HSTORE();

                        expect(type.validate({ foo: "bar" })).to.equal(true);
                    });
                });
            });
        }

        describe("UUID", () => {
            testsql("UUID", DataTypes.UUID, {
                postgres: "UUID",
                mssql: "CHAR(36)",
                mysql: "CHAR(36) BINARY",
                sqlite: "UUID"
            });

            describe("validate", () => {
                it("should throw an error if `value` is invalid", () => {
                    const type = new DataTypes.UUID();

                    expect(() => {
                        type.validate("foobar");
                    }).to.throw(Sequelize.ValidationError, '"foobar" is not a valid uuid');

                    expect(() => {
                        type.validate(["foobar"]);
                    }).to.throw(Sequelize.ValidationError, '["foobar"] is not a valid uuid');
                });

                it("should return `true` if `value` is an uuid", () => {
                    const type = new DataTypes.UUID();

                    expect(type.validate(adone.util.uuid.v4())).to.equal(true);
                });

                it("should return `true` if `value` is a string and we accept strings", () => {
                    const type = new DataTypes.UUID();

                    expect(type.validate("foobar", { acceptStrings: true })).to.equal(true);
                });
            });
        });

        describe("UUIDV1", () => {
            testsql("UUIDV1", DataTypes.UUIDV1, {
                default: "UUIDV1"
            });

            describe("validate", () => {
                it("should throw an error if `value` is invalid", () => {
                    const type = new DataTypes.UUIDV1();

                    expect(() => {
                        type.validate("foobar");
                    }).to.throw(Sequelize.ValidationError, '"foobar" is not a valid uuid');

                    expect(() => {
                        type.validate(["foobar"]);
                    }).to.throw(Sequelize.ValidationError, '["foobar"] is not a valid uuid');
                });

                it("should return `true` if `value` is an uuid", () => {
                    const type = new DataTypes.UUIDV1();

                    expect(type.validate(adone.util.uuid.v1())).to.equal(true);
                });

                it("should return `true` if `value` is a string and we accept strings", () => {
                    const type = new DataTypes.UUIDV1();

                    expect(type.validate("foobar", { acceptStrings: true })).to.equal(true);
                });
            });
        });

        describe("UUIDV4", () => {
            testsql("UUIDV4", DataTypes.UUIDV4, {
                default: "UUIDV4"
            });

            describe("validate", () => {
                it("should throw an error if `value` is invalid", () => {
                    const type = new DataTypes.UUIDV4();
                    const value = adone.util.uuid.v1();

                    expect(() => {
                        type.validate(value);
                    }).to.throw(Sequelize.ValidationError, util.format("%j is not a valid uuidv4", value));

                    expect(() => {
                        type.validate(["foobar"]);
                    }).to.throw(Sequelize.ValidationError, '["foobar"] is not a valid uuidv4');
                });

                it("should return `true` if `value` is an uuid", () => {
                    const type = new DataTypes.UUIDV4();

                    expect(type.validate(adone.util.uuid.v4())).to.equal(true);
                });

                it("should return `true` if `value` is a string and we accept strings", () => {
                    const type = new DataTypes.UUIDV4();

                    expect(type.validate("foobar", { acceptStrings: true })).to.equal(true);
                });
            });
        });

        describe("NOW", () => {
            testsql("NOW", DataTypes.NOW, {
                default: "NOW",
                mssql: "GETDATE()"
            });
        });

        describe("INTEGER", () => {
            testsql("INTEGER", DataTypes.INTEGER, {
                default: "INTEGER"
            });

            testsql("INTEGER.UNSIGNED", DataTypes.INTEGER.UNSIGNED, {
                default: "INTEGER UNSIGNED",
                postgres: "INTEGER",
                mssql: "INTEGER"
            });

            testsql("INTEGER.UNSIGNED.ZEROFILL", DataTypes.INTEGER.UNSIGNED.ZEROFILL, {
                default: "INTEGER UNSIGNED ZEROFILL",
                postgres: "INTEGER",
                mssql: "INTEGER"
            });

            testsql("INTEGER(11)", new DataTypes.INTEGER(11), {
                default: "INTEGER(11)",
                postgres: "INTEGER",
                mssql: "INTEGER"
            });

            testsql("INTEGER({ length: 11 })", new DataTypes.INTEGER({ length: 11 }), {
                default: "INTEGER(11)",
                postgres: "INTEGER",
                mssql: "INTEGER"
            });

            testsql("INTEGER(11).UNSIGNED", new DataTypes.INTEGER(11).UNSIGNED, {
                default: "INTEGER(11) UNSIGNED",
                sqlite: "INTEGER UNSIGNED(11)",
                postgres: "INTEGER",
                mssql: "INTEGER"
            });

            testsql("INTEGER(11).UNSIGNED.ZEROFILL", new DataTypes.INTEGER(11).UNSIGNED.ZEROFILL, {
                default: "INTEGER(11) UNSIGNED ZEROFILL",
                sqlite: "INTEGER UNSIGNED ZEROFILL(11)",
                postgres: "INTEGER",
                mssql: "INTEGER"
            });

            testsql("INTEGER(11).ZEROFILL", new DataTypes.INTEGER(11).ZEROFILL, {
                default: "INTEGER(11) ZEROFILL",
                sqlite: "INTEGER ZEROFILL(11)",
                postgres: "INTEGER",
                mssql: "INTEGER"
            });

            testsql("INTEGER(11).ZEROFILL.UNSIGNED", new DataTypes.INTEGER(11).ZEROFILL.UNSIGNED, {
                default: "INTEGER(11) UNSIGNED ZEROFILL",
                sqlite: "INTEGER UNSIGNED ZEROFILL(11)",
                postgres: "INTEGER",
                mssql: "INTEGER"
            });

            describe("validate", () => {
                it("should throw an error if `value` is invalid", () => {
                    const type = new DataTypes.INTEGER();

                    expect(() => {
                        type.validate("foobar");
                    }).to.throw(Sequelize.ValidationError, '"foobar" is not a valid integer');

                    expect(() => {
                        type.validate("123.45");
                    }).to.throw(Sequelize.ValidationError, '"123.45" is not a valid integer');

                    expect(() => {
                        type.validate(123.45);
                    }).to.throw(Sequelize.ValidationError, "123.45 is not a valid integer");
                });

                it("should return `true` if `value` is a valid integer", () => {
                    const type = new DataTypes.INTEGER();

                    expect(type.validate("12345")).to.equal(true);
                    expect(type.validate(12345)).to.equal(true);
                });
            });
        });

        describe("TINYINT", () => {
            const cases = [
                {
                    title: "TINYINT",
                    dataType: DataTypes.TINYINT,
                    expect: {
                        default: "TINYINT"
                    }
                },
                {
                    title: "TINYINT(2)",
                    dataType: new DataTypes.TINYINT(2),
                    expect: {
                        default: "TINYINT(2)",
                        mssql: "TINYINT"
                    }
                },
                {
                    title: "TINYINT({ length: 2 })",
                    dataType: new DataTypes.TINYINT({ length: 2 }),
                    expect: {
                        default: "TINYINT(2)",
                        mssql: "TINYINT"
                    }
                },
                {
                    title: "TINYINT.UNSIGNED",
                    dataType: DataTypes.TINYINT.UNSIGNED,
                    expect: {
                        default: "TINYINT UNSIGNED",
                        mssql: "TINYINT"
                    }
                },
                {
                    title: "TINYINT(2).UNSIGNED",
                    dataType: new DataTypes.TINYINT(2).UNSIGNED,
                    expect: {
                        default: "TINYINT(2) UNSIGNED",
                        sqlite: "TINYINT UNSIGNED(2)",
                        mssql: "TINYINT"
                    }
                },
                {
                    title: "TINYINT.UNSIGNED.ZEROFILL",
                    dataType: DataTypes.TINYINT.UNSIGNED.ZEROFILL,
                    expect: {
                        default: "TINYINT UNSIGNED ZEROFILL",
                        mssql: "TINYINT"
                    }
                },
                {
                    title: "TINYINT(2).UNSIGNED.ZEROFILL",
                    dataType: new DataTypes.TINYINT(2).UNSIGNED.ZEROFILL,
                    expect: {
                        default: "TINYINT(2) UNSIGNED ZEROFILL",
                        sqlite: "TINYINT UNSIGNED ZEROFILL(2)",
                        mssql: "TINYINT"
                    }
                },
                {
                    title: "TINYINT.ZEROFILL",
                    dataType: DataTypes.TINYINT.ZEROFILL,
                    expect: {
                        default: "TINYINT ZEROFILL",
                        mssql: "TINYINT"
                    }
                },
                {
                    title: "TINYINT(2).ZEROFILL",
                    dataType: new DataTypes.TINYINT(2).ZEROFILL,
                    expect: {
                        default: "TINYINT(2) ZEROFILL",
                        sqlite: "TINYINT ZEROFILL(2)",
                        mssql: "TINYINT"
                    }
                },
                {
                    title: "TINYINT.ZEROFILL.UNSIGNED",
                    dataType: DataTypes.TINYINT.ZEROFILL.UNSIGNED,
                    expect: {
                        default: "TINYINT UNSIGNED ZEROFILL",
                        mssql: "TINYINT"
                    }
                },
                {
                    title: "TINYINT(2).ZEROFILL.UNSIGNED",
                    dataType: new DataTypes.TINYINT(2).ZEROFILL.UNSIGNED,
                    expect: {
                        default: "TINYINT(2) UNSIGNED ZEROFILL",
                        sqlite: "TINYINT UNSIGNED ZEROFILL(2)",
                        mssql: "TINYINT"
                    }
                }
            ];
            cases.forEach((row) => {
                testsql(row.title, row.dataType, row.expect);
            });

            describe("validate", () => {
                it("should throw an error if `value` is invalid", () => {
                    const type = new DataTypes.TINYINT();

                    expect(() => {
                        type.validate("foobar");
                    }).to.throw(Sequelize.ValidationError, '"foobar" is not a valid tinyint');

                    expect(() => {
                        type.validate(123.45);
                    }).to.throw(Sequelize.ValidationError, "123.45 is not a valid tinyint");
                });

                it("should return `true` if `value` is an integer", () => {
                    const type = new DataTypes.TINYINT();

                    expect(type.validate(-128)).to.equal(true);
                    expect(type.validate("127")).to.equal(true);
                });
            });
        });

        describe("SMALLINT", () => {
            const cases = [
                {
                    title: "SMALLINT",
                    dataType: DataTypes.SMALLINT,
                    expect: {
                        default: "SMALLINT"
                    }
                },
                {
                    title: "SMALLINT(4)",
                    dataType: new DataTypes.SMALLINT(4),
                    expect: {
                        default: "SMALLINT(4)",
                        postgres: "SMALLINT",
                        mssql: "SMALLINT"
                    }
                },
                {
                    title: "SMALLINT({ length: 4 })",
                    dataType: new DataTypes.SMALLINT({ length: 4 }),
                    expect: {
                        default: "SMALLINT(4)",
                        postgres: "SMALLINT",
                        mssql: "SMALLINT"
                    }
                },
                {
                    title: "SMALLINT.UNSIGNED",
                    dataType: DataTypes.SMALLINT.UNSIGNED,
                    expect: {
                        default: "SMALLINT UNSIGNED",
                        postgres: "SMALLINT",
                        mssql: "SMALLINT"
                    }
                },
                {
                    title: "SMALLINT(4).UNSIGNED",
                    dataType: new DataTypes.SMALLINT(4).UNSIGNED,
                    expect: {
                        default: "SMALLINT(4) UNSIGNED",
                        sqlite: "SMALLINT UNSIGNED(4)",
                        postgres: "SMALLINT",
                        mssql: "SMALLINT"
                    }
                },
                {
                    title: "SMALLINT.UNSIGNED.ZEROFILL",
                    dataType: DataTypes.SMALLINT.UNSIGNED.ZEROFILL,
                    expect: {
                        default: "SMALLINT UNSIGNED ZEROFILL",
                        postgres: "SMALLINT",
                        mssql: "SMALLINT"
                    }
                },
                {
                    title: "SMALLINT(4).UNSIGNED.ZEROFILL",
                    dataType: new DataTypes.SMALLINT(4).UNSIGNED.ZEROFILL,
                    expect: {
                        default: "SMALLINT(4) UNSIGNED ZEROFILL",
                        sqlite: "SMALLINT UNSIGNED ZEROFILL(4)",
                        postgres: "SMALLINT",
                        mssql: "SMALLINT"
                    }
                },
                {
                    title: "SMALLINT.ZEROFILL",
                    dataType: DataTypes.SMALLINT.ZEROFILL,
                    expect: {
                        default: "SMALLINT ZEROFILL",
                        postgres: "SMALLINT",
                        mssql: "SMALLINT"
                    }
                },
                {
                    title: "SMALLINT(4).ZEROFILL",
                    dataType: new DataTypes.SMALLINT(4).ZEROFILL,
                    expect: {
                        default: "SMALLINT(4) ZEROFILL",
                        sqlite: "SMALLINT ZEROFILL(4)",
                        postgres: "SMALLINT",
                        mssql: "SMALLINT"
                    }
                },
                {
                    title: "SMALLINT.ZEROFILL.UNSIGNED",
                    dataType: DataTypes.SMALLINT.ZEROFILL.UNSIGNED,
                    expect: {
                        default: "SMALLINT UNSIGNED ZEROFILL",
                        postgres: "SMALLINT",
                        mssql: "SMALLINT"
                    }
                },
                {
                    title: "SMALLINT(4).ZEROFILL.UNSIGNED",
                    dataType: new DataTypes.SMALLINT(4).ZEROFILL.UNSIGNED,
                    expect: {
                        default: "SMALLINT(4) UNSIGNED ZEROFILL",
                        sqlite: "SMALLINT UNSIGNED ZEROFILL(4)",
                        postgres: "SMALLINT",
                        mssql: "SMALLINT"
                    }
                }
            ];
            cases.forEach((row) => {
                testsql(row.title, row.dataType, row.expect);
            });

            describe("validate", () => {
                it("should throw an error if `value` is invalid", () => {
                    const type = new DataTypes.SMALLINT();

                    expect(() => {
                        type.validate("foobar");
                    }).to.throw(Sequelize.ValidationError, '"foobar" is not a valid smallint');

                    expect(() => {
                        type.validate(123.45);
                    }).to.throw(Sequelize.ValidationError, "123.45 is not a valid smallint");
                });

                it("should return `true` if `value` is an integer", () => {
                    const type = new DataTypes.SMALLINT();

                    expect(type.validate(-32768)).to.equal(true);
                    expect(type.validate("32767")).to.equal(true);
                });
            });
        });

        describe("MEDIUMINT", () => {
            const cases = [
                {
                    title: "MEDIUMINT",
                    dataType: DataTypes.MEDIUMINT,
                    expect: {
                        default: "MEDIUMINT"
                    }
                },
                {
                    title: "MEDIUMINT(6)",
                    dataType: new DataTypes.MEDIUMINT(6),
                    expect: {
                        default: "MEDIUMINT(6)"
                    }
                },
                {
                    title: "MEDIUMINT({ length: 6 })",
                    dataType: new DataTypes.MEDIUMINT({ length: 6 }),
                    expect: {
                        default: "MEDIUMINT(6)"
                    }
                },
                {
                    title: "MEDIUMINT.UNSIGNED",
                    dataType: DataTypes.MEDIUMINT.UNSIGNED,
                    expect: {
                        default: "MEDIUMINT UNSIGNED"
                    }
                },
                {
                    title: "MEDIUMINT(6).UNSIGNED",
                    dataType: new DataTypes.MEDIUMINT(6).UNSIGNED,
                    expect: {
                        default: "MEDIUMINT(6) UNSIGNED",
                        sqlite: "MEDIUMINT UNSIGNED(6)"
                    }
                },
                {
                    title: "MEDIUMINT.UNSIGNED.ZEROFILL",
                    dataType: DataTypes.MEDIUMINT.UNSIGNED.ZEROFILL,
                    expect: {
                        default: "MEDIUMINT UNSIGNED ZEROFILL"
                    }
                },
                {
                    title: "MEDIUMINT(6).UNSIGNED.ZEROFILL",
                    dataType: new DataTypes.MEDIUMINT(6).UNSIGNED.ZEROFILL,
                    expect: {
                        default: "MEDIUMINT(6) UNSIGNED ZEROFILL",
                        sqlite: "MEDIUMINT UNSIGNED ZEROFILL(6)"
                    }
                },
                {
                    title: "MEDIUMINT.ZEROFILL",
                    dataType: DataTypes.MEDIUMINT.ZEROFILL,
                    expect: {
                        default: "MEDIUMINT ZEROFILL"
                    }
                },
                {
                    title: "MEDIUMINT(6).ZEROFILL",
                    dataType: new DataTypes.MEDIUMINT(6).ZEROFILL,
                    expect: {
                        default: "MEDIUMINT(6) ZEROFILL",
                        sqlite: "MEDIUMINT ZEROFILL(6)"
                    }
                },
                {
                    title: "MEDIUMINT.ZEROFILL.UNSIGNED",
                    dataType: DataTypes.MEDIUMINT.ZEROFILL.UNSIGNED,
                    expect: {
                        default: "MEDIUMINT UNSIGNED ZEROFILL"
                    }
                },
                {
                    title: "MEDIUMINT(6).ZEROFILL.UNSIGNED",
                    dataType: new DataTypes.MEDIUMINT(6).ZEROFILL.UNSIGNED,
                    expect: {
                        default: "MEDIUMINT(6) UNSIGNED ZEROFILL",
                        sqlite: "MEDIUMINT UNSIGNED ZEROFILL(6)"
                    }
                }
            ];
            cases.forEach((row) => {
                testsql(row.title, row.dataType, row.expect);
            });

            describe("validate", () => {
                it("should throw an error if `value` is invalid", () => {
                    const type = new DataTypes.MEDIUMINT();

                    expect(() => {
                        type.validate("foobar");
                    }).to.throw(Sequelize.ValidationError, '"foobar" is not a valid mediumint');

                    expect(() => {
                        type.validate(123.45);
                    }).to.throw(Sequelize.ValidationError, "123.45 is not a valid mediumint");
                });

                it("should return `true` if `value` is an integer", () => {
                    const type = new DataTypes.MEDIUMINT();

                    expect(type.validate(-8388608)).to.equal(true);
                    expect(type.validate("8388607")).to.equal(true);
                });
            });
        });

        describe("BIGINT", () => {
            testsql("BIGINT", DataTypes.BIGINT, {
                default: "BIGINT"
            });

            testsql("BIGINT.UNSIGNED", DataTypes.BIGINT.UNSIGNED, {
                default: "BIGINT UNSIGNED",
                postgres: "BIGINT",
                mssql: "BIGINT"
            });

            testsql("BIGINT.UNSIGNED.ZEROFILL", DataTypes.BIGINT.UNSIGNED.ZEROFILL, {
                default: "BIGINT UNSIGNED ZEROFILL",
                postgres: "BIGINT",
                mssql: "BIGINT"
            });

            testsql("BIGINT(11)", new DataTypes.BIGINT(11), {
                default: "BIGINT(11)",
                postgres: "BIGINT",
                mssql: "BIGINT"
            });

            testsql("BIGINT({ length: 11 })", new DataTypes.BIGINT({ length: 11 }), {
                default: "BIGINT(11)",
                postgres: "BIGINT",
                mssql: "BIGINT"
            });

            testsql("BIGINT(11).UNSIGNED", new DataTypes.BIGINT(11).UNSIGNED, {
                default: "BIGINT(11) UNSIGNED",
                sqlite: "BIGINT UNSIGNED(11)",
                postgres: "BIGINT",
                mssql: "BIGINT"
            });

            testsql("BIGINT(11).UNSIGNED.ZEROFILL", new DataTypes.BIGINT(11).UNSIGNED.ZEROFILL, {
                default: "BIGINT(11) UNSIGNED ZEROFILL",
                sqlite: "BIGINT UNSIGNED ZEROFILL(11)",
                postgres: "BIGINT",
                mssql: "BIGINT"
            });

            testsql("BIGINT(11).ZEROFILL", new DataTypes.BIGINT(11).ZEROFILL, {
                default: "BIGINT(11) ZEROFILL",
                sqlite: "BIGINT ZEROFILL(11)",
                postgres: "BIGINT",
                mssql: "BIGINT"
            });

            testsql("BIGINT(11).ZEROFILL.UNSIGNED", new DataTypes.BIGINT(11).ZEROFILL.UNSIGNED, {
                default: "BIGINT(11) UNSIGNED ZEROFILL",
                sqlite: "BIGINT UNSIGNED ZEROFILL(11)",
                postgres: "BIGINT",
                mssql: "BIGINT"
            });

            describe("validate", () => {
                it("should throw an error if `value` is invalid", () => {
                    const type = new DataTypes.BIGINT();

                    expect(() => {
                        type.validate("foobar");
                    }).to.throw(Sequelize.ValidationError, '"foobar" is not a valid bigint');

                    expect(() => {
                        type.validate(123.45);
                    }).to.throw(Sequelize.ValidationError, "123.45 is not a valid bigint");
                });

                it("should return `true` if `value` is an integer", () => {
                    const type = new DataTypes.BIGINT();

                    expect(type.validate("9223372036854775807")).to.equal(true);
                });
            });
        });

        describe("REAL", () => {
            testsql("REAL", DataTypes.REAL, {
                default: "REAL"
            });

            testsql("REAL.UNSIGNED", DataTypes.REAL.UNSIGNED, {
                default: "REAL UNSIGNED",
                postgres: "REAL",
                mssql: "REAL"
            });

            testsql("REAL(11)", new DataTypes.REAL(11), {
                default: "REAL(11)",
                postgres: "REAL",
                mssql: "REAL"
            });

            testsql("REAL({ length: 11 })", new DataTypes.REAL({ length: 11 }), {
                default: "REAL(11)",
                postgres: "REAL",
                mssql: "REAL"
            });

            testsql("REAL(11).UNSIGNED", new DataTypes.REAL(11).UNSIGNED, {
                default: "REAL(11) UNSIGNED",
                sqlite: "REAL UNSIGNED(11)",
                postgres: "REAL",
                mssql: "REAL"
            });

            testsql("REAL(11).UNSIGNED.ZEROFILL", new DataTypes.REAL(11).UNSIGNED.ZEROFILL, {
                default: "REAL(11) UNSIGNED ZEROFILL",
                sqlite: "REAL UNSIGNED ZEROFILL(11)",
                postgres: "REAL",
                mssql: "REAL"
            });

            testsql("REAL(11).ZEROFILL", new DataTypes.REAL(11).ZEROFILL, {
                default: "REAL(11) ZEROFILL",
                sqlite: "REAL ZEROFILL(11)",
                postgres: "REAL",
                mssql: "REAL"
            });

            testsql("REAL(11).ZEROFILL.UNSIGNED", new DataTypes.REAL(11).ZEROFILL.UNSIGNED, {
                default: "REAL(11) UNSIGNED ZEROFILL",
                sqlite: "REAL UNSIGNED ZEROFILL(11)",
                postgres: "REAL",
                mssql: "REAL"
            });

            testsql("REAL(11, 12)", new DataTypes.REAL(11, 12), {
                default: "REAL(11,12)",
                postgres: "REAL",
                mssql: "REAL"
            });

            testsql("REAL(11, 12).UNSIGNED", new DataTypes.REAL(11, 12).UNSIGNED, {
                default: "REAL(11,12) UNSIGNED",
                sqlite: "REAL UNSIGNED(11,12)",
                postgres: "REAL",
                mssql: "REAL"
            });

            testsql("REAL({ length: 11, decimals: 12 }).UNSIGNED", new DataTypes.REAL({ length: 11, decimals: 12 }).UNSIGNED, {
                default: "REAL(11,12) UNSIGNED",
                sqlite: "REAL UNSIGNED(11,12)",
                postgres: "REAL",
                mssql: "REAL"
            });

            testsql("REAL(11, 12).UNSIGNED.ZEROFILL", new DataTypes.REAL(11, 12).UNSIGNED.ZEROFILL, {
                default: "REAL(11,12) UNSIGNED ZEROFILL",
                sqlite: "REAL UNSIGNED ZEROFILL(11,12)",
                postgres: "REAL",
                mssql: "REAL"
            });

            testsql("REAL(11, 12).ZEROFILL", new DataTypes.REAL(11, 12).ZEROFILL, {
                default: "REAL(11,12) ZEROFILL",
                sqlite: "REAL ZEROFILL(11,12)",
                postgres: "REAL",
                mssql: "REAL"
            });

            testsql("REAL(11, 12).ZEROFILL.UNSIGNED", new DataTypes.REAL(11, 12).ZEROFILL.UNSIGNED, {
                default: "REAL(11,12) UNSIGNED ZEROFILL",
                sqlite: "REAL UNSIGNED ZEROFILL(11,12)",
                postgres: "REAL",
                mssql: "REAL"
            });
        });

        describe("DOUBLE PRECISION", () => {
            testsql("DOUBLE", DataTypes.DOUBLE, {
                default: "DOUBLE PRECISION"
            });

            testsql("DOUBLE.UNSIGNED", DataTypes.DOUBLE.UNSIGNED, {
                default: "DOUBLE PRECISION UNSIGNED",
                postgres: "DOUBLE PRECISION"
            });

            testsql("DOUBLE(11)", new DataTypes.DOUBLE(11), {
                default: "DOUBLE PRECISION(11)",
                postgres: "DOUBLE PRECISION"
            });

            testsql("DOUBLE(11).UNSIGNED", new DataTypes.DOUBLE(11).UNSIGNED, {
                default: "DOUBLE PRECISION(11) UNSIGNED",
                sqlite: "DOUBLE PRECISION UNSIGNED(11)",
                postgres: "DOUBLE PRECISION"
            });

            testsql("DOUBLE({ length: 11 }).UNSIGNED", new DataTypes.DOUBLE({ length: 11 }).UNSIGNED, {
                default: "DOUBLE PRECISION(11) UNSIGNED",
                sqlite: "DOUBLE PRECISION UNSIGNED(11)",
                postgres: "DOUBLE PRECISION"
            });

            testsql("DOUBLE(11).UNSIGNED.ZEROFILL", new DataTypes.DOUBLE(11).UNSIGNED.ZEROFILL, {
                default: "DOUBLE PRECISION(11) UNSIGNED ZEROFILL",
                sqlite: "DOUBLE PRECISION UNSIGNED ZEROFILL(11)",
                postgres: "DOUBLE PRECISION"
            });

            testsql("DOUBLE(11).ZEROFILL", new DataTypes.DOUBLE(11).ZEROFILL, {
                default: "DOUBLE PRECISION(11) ZEROFILL",
                sqlite: "DOUBLE PRECISION ZEROFILL(11)",
                postgres: "DOUBLE PRECISION"
            });

            testsql("DOUBLE(11).ZEROFILL.UNSIGNED", new DataTypes.DOUBLE(11).ZEROFILL.UNSIGNED, {
                default: "DOUBLE PRECISION(11) UNSIGNED ZEROFILL",
                sqlite: "DOUBLE PRECISION UNSIGNED ZEROFILL(11)",
                postgres: "DOUBLE PRECISION"
            });

            testsql("DOUBLE(11, 12)", new DataTypes.DOUBLE(11, 12), {
                default: "DOUBLE PRECISION(11,12)",
                postgres: "DOUBLE PRECISION"
            });

            testsql("DOUBLE(11, 12).UNSIGNED", new DataTypes.DOUBLE(11, 12).UNSIGNED, {
                default: "DOUBLE PRECISION(11,12) UNSIGNED",
                sqlite: "DOUBLE PRECISION UNSIGNED(11,12)",
                postgres: "DOUBLE PRECISION"
            });

            testsql("DOUBLE(11, 12).UNSIGNED.ZEROFILL", new DataTypes.DOUBLE(11, 12).UNSIGNED.ZEROFILL, {
                default: "DOUBLE PRECISION(11,12) UNSIGNED ZEROFILL",
                sqlite: "DOUBLE PRECISION UNSIGNED ZEROFILL(11,12)",
                postgres: "DOUBLE PRECISION"
            });

            testsql("DOUBLE(11, 12).ZEROFILL", new DataTypes.DOUBLE(11, 12).ZEROFILL, {
                default: "DOUBLE PRECISION(11,12) ZEROFILL",
                sqlite: "DOUBLE PRECISION ZEROFILL(11,12)",
                postgres: "DOUBLE PRECISION"
            });

            testsql("DOUBLE(11, 12).ZEROFILL.UNSIGNED", new DataTypes.DOUBLE(11, 12).ZEROFILL.UNSIGNED, {
                default: "DOUBLE PRECISION(11,12) UNSIGNED ZEROFILL",
                sqlite: "DOUBLE PRECISION UNSIGNED ZEROFILL(11,12)",
                postgres: "DOUBLE PRECISION"
            });
        });

        describe("FLOAT", () => {
            testsql("FLOAT", DataTypes.FLOAT, {
                default: "FLOAT",
                postgres: "FLOAT"
            });

            testsql("FLOAT.UNSIGNED", DataTypes.FLOAT.UNSIGNED, {
                default: "FLOAT UNSIGNED",
                postgres: "FLOAT",
                mssql: "FLOAT"
            });

            testsql("FLOAT(11)", new DataTypes.FLOAT(11), {
                default: "FLOAT(11)",
                postgres: "FLOAT(11)", // 1-24 = 4 bytes; 35-53 = 8 bytes
                mssql: "FLOAT(11)" // 1-24 = 4 bytes; 35-53 = 8 bytes
            });

            testsql("FLOAT(11).UNSIGNED", new DataTypes.FLOAT(11).UNSIGNED, {
                default: "FLOAT(11) UNSIGNED",
                sqlite: "FLOAT UNSIGNED(11)",
                postgres: "FLOAT(11)",
                mssql: "FLOAT(11)"
            });

            testsql("FLOAT(11).UNSIGNED.ZEROFILL", new DataTypes.FLOAT(11).UNSIGNED.ZEROFILL, {
                default: "FLOAT(11) UNSIGNED ZEROFILL",
                sqlite: "FLOAT UNSIGNED ZEROFILL(11)",
                postgres: "FLOAT(11)",
                mssql: "FLOAT(11)"
            });

            testsql("FLOAT(11).ZEROFILL", new DataTypes.FLOAT(11).ZEROFILL, {
                default: "FLOAT(11) ZEROFILL",
                sqlite: "FLOAT ZEROFILL(11)",
                postgres: "FLOAT(11)",
                mssql: "FLOAT(11)"
            });

            testsql("FLOAT({ length: 11 }).ZEROFILL", new DataTypes.FLOAT({ length: 11 }).ZEROFILL, {
                default: "FLOAT(11) ZEROFILL",
                sqlite: "FLOAT ZEROFILL(11)",
                postgres: "FLOAT(11)",
                mssql: "FLOAT(11)"
            });

            testsql("FLOAT(11).ZEROFILL.UNSIGNED", new DataTypes.FLOAT(11).ZEROFILL.UNSIGNED, {
                default: "FLOAT(11) UNSIGNED ZEROFILL",
                sqlite: "FLOAT UNSIGNED ZEROFILL(11)",
                postgres: "FLOAT(11)",
                mssql: "FLOAT(11)"
            });

            testsql("FLOAT(11, 12)", new DataTypes.FLOAT(11, 12), {
                default: "FLOAT(11,12)",
                postgres: "FLOAT",
                mssql: "FLOAT"
            });

            testsql("FLOAT(11, 12).UNSIGNED", new DataTypes.FLOAT(11, 12).UNSIGNED, {
                default: "FLOAT(11,12) UNSIGNED",
                sqlite: "FLOAT UNSIGNED(11,12)",
                postgres: "FLOAT",
                mssql: "FLOAT"
            });

            testsql("FLOAT({ length: 11, decimals: 12 }).UNSIGNED", new DataTypes.FLOAT({ length: 11, decimals: 12 }).UNSIGNED, {
                default: "FLOAT(11,12) UNSIGNED",
                sqlite: "FLOAT UNSIGNED(11,12)",
                postgres: "FLOAT",
                mssql: "FLOAT"
            });

            testsql("FLOAT(11, 12).UNSIGNED.ZEROFILL", new DataTypes.FLOAT(11, 12).UNSIGNED.ZEROFILL, {
                default: "FLOAT(11,12) UNSIGNED ZEROFILL",
                sqlite: "FLOAT UNSIGNED ZEROFILL(11,12)",
                postgres: "FLOAT",
                mssql: "FLOAT"
            });

            testsql("FLOAT(11, 12).ZEROFILL", new DataTypes.FLOAT(11, 12).ZEROFILL, {
                default: "FLOAT(11,12) ZEROFILL",
                sqlite: "FLOAT ZEROFILL(11,12)",
                postgres: "FLOAT",
                mssql: "FLOAT"
            });

            testsql("FLOAT(11, 12).ZEROFILL.UNSIGNED", new DataTypes.FLOAT(11, 12).ZEROFILL.UNSIGNED, {
                default: "FLOAT(11,12) UNSIGNED ZEROFILL",
                sqlite: "FLOAT UNSIGNED ZEROFILL(11,12)",
                postgres: "FLOAT",
                mssql: "FLOAT"
            });

            describe("validate", () => {
                it("should throw an error if `value` is invalid", () => {
                    const type = new DataTypes.FLOAT();

                    expect(() => {
                        type.validate("foobar");
                    }).to.throw(Sequelize.ValidationError, '"foobar" is not a valid float');
                });

                it("should return `true` if `value` is a float", () => {
                    const type = new DataTypes.FLOAT();

                    expect(type.validate(1.2)).to.equal(true);
                    expect(type.validate("1")).to.equal(true);
                    expect(type.validate("1.2")).to.equal(true);
                    expect(type.validate("-0.123")).to.equal(true);
                    expect(type.validate("-0.22250738585072011e-307")).to.equal(true);
                });
            });
        });

        if (current.dialect.supports.NUMERIC) {
            testsql("NUMERIC", DataTypes.NUMERIC, {
                default: "DECIMAL"
            });

            testsql("NUMERIC(15,5)", new DataTypes.NUMERIC(15, 5), {
                default: "DECIMAL(15,5)"
            });
        }

        describe("DECIMAL", () => {
            testsql("DECIMAL", DataTypes.DECIMAL, {
                default: "DECIMAL"
            });

            testsql("DECIMAL(10, 2)", new DataTypes.DECIMAL(10, 2), {
                default: "DECIMAL(10,2)"
            });

            testsql("DECIMAL({ precision: 10, scale: 2 })", new DataTypes.DECIMAL({ precision: 10, scale: 2 }), {
                default: "DECIMAL(10,2)"
            });

            testsql("DECIMAL(10)", new DataTypes.DECIMAL(10), {
                default: "DECIMAL(10)"
            });

            testsql("DECIMAL({ precision: 10 })", new DataTypes.DECIMAL({ precision: 10 }), {
                default: "DECIMAL(10)"
            });

            testsql("DECIMAL.UNSIGNED", DataTypes.DECIMAL.UNSIGNED, {
                mysql: "DECIMAL UNSIGNED",
                default: "DECIMAL"
            });

            testsql("DECIMAL.UNSIGNED.ZEROFILL", DataTypes.DECIMAL.UNSIGNED.ZEROFILL, {
                mysql: "DECIMAL UNSIGNED ZEROFILL",
                default: "DECIMAL"
            });

            testsql("DECIMAL({ precision: 10, scale: 2 }).UNSIGNED", new DataTypes.DECIMAL({ precision: 10, scale: 2 }).UNSIGNED, {
                mysql: "DECIMAL(10,2) UNSIGNED",
                default: "DECIMAL(10,2)"
            });

            describe("validate", () => {
                it("should throw an error if `value` is invalid", () => {
                    const type = new DataTypes.DECIMAL(10);

                    expect(() => {
                        type.validate("foobar");
                    }).to.throw(Sequelize.ValidationError, '"foobar" is not a valid decimal');

                    expect(() => {
                        type.validate("0.1a");
                    }).to.throw(Sequelize.ValidationError, '"0.1a" is not a valid decimal');

                    expect(() => {
                        type.validate(NaN);
                    }).to.throw(Sequelize.ValidationError, "null is not a valid decimal");
                });

                it("should return `true` if `value` is a decimal", () => {
                    const type = new DataTypes.DECIMAL(10);

                    expect(type.validate(123)).to.equal(true);
                    expect(type.validate(1.2)).to.equal(true);
                    expect(type.validate(-0.25)).to.equal(true);
                    expect(type.validate(0.0000000000001)).to.equal(true);
                    expect(type.validate("123")).to.equal(true);
                    expect(type.validate("1.2")).to.equal(true);
                    expect(type.validate("-0.25")).to.equal(true);
                    expect(type.validate("0.0000000000001")).to.equal(true);
                });
            });
        });

        describe("ENUM", () => {
            // TODO: Fix Enums and add more tests
            // testsql('ENUM("value 1", "value 2")', new DataTypes.ENUM('value 1', 'value 2'), {
            //   default: 'ENUM'
            // });

            describe("validate", () => {
                it("should throw an error if `value` is invalid", () => {
                    const type = new DataTypes.ENUM("foo");

                    expect(() => {
                        type.validate("foobar");
                    }).to.throw(Sequelize.ValidationError, '"foobar" is not a valid choice in ["foo"]');
                });

                it("should return `true` if `value` is a valid choice", () => {
                    const type = new DataTypes.ENUM("foobar", "foobiz");

                    expect(type.validate("foobar")).to.equal(true);
                    expect(type.validate("foobiz")).to.equal(true);
                });
            });
        });

        describe("BLOB", () => {
            testsql("BLOB", DataTypes.BLOB, {
                default: "BLOB",
                mssql: "VARBINARY(MAX)",
                postgres: "BYTEA"
            });

            testsql('BLOB("tiny")', new DataTypes.BLOB("tiny"), {
                default: "TINYBLOB",
                mssql: "VARBINARY(256)",
                postgres: "BYTEA"
            });

            testsql('BLOB("medium")', new DataTypes.BLOB("medium"), {
                default: "MEDIUMBLOB",
                mssql: "VARBINARY(MAX)",
                postgres: "BYTEA"
            });

            testsql('BLOB({ length: "medium" })', new DataTypes.BLOB({ length: "medium" }), {
                default: "MEDIUMBLOB",
                mssql: "VARBINARY(MAX)",
                postgres: "BYTEA"
            });

            testsql('BLOB("long")', new DataTypes.BLOB("long"), {
                default: "LONGBLOB",
                mssql: "VARBINARY(MAX)",
                postgres: "BYTEA"
            });

            describe("validate", () => {
                it("should throw an error if `value` is invalid", () => {
                    const type = new DataTypes.BLOB();

                    expect(() => {
                        type.validate(12345);
                    }).to.throw(Sequelize.ValidationError, "12345 is not a valid blob");
                });

                it("should return `true` if `value` is a blob", () => {
                    const type = new DataTypes.BLOB();

                    expect(type.validate("foobar")).to.equal(true);
                    expect(type.validate(Buffer.from("foobar"))).to.equal(true);
                });
            });
        });

        describe("RANGE", () => {
            describe("validate", () => {
                it("should throw an error if `value` is invalid", () => {
                    const type = new DataTypes.RANGE();

                    expect(() => {
                        type.validate("foobar");
                    }).to.throw(Sequelize.ValidationError, '"foobar" is not a valid range');
                });

                it("should throw an error if `value` is not an array with two elements", () => {
                    const type = new DataTypes.RANGE();

                    expect(() => {
                        type.validate([1]);
                    }).to.throw(Sequelize.ValidationError, "A range must be an array with two elements");
                });

                it("should throw an error if `value.inclusive` is invalid", () => {
                    const type = new DataTypes.RANGE();

                    expect(() => {
                        type.validate({ inclusive: "foobar" });
                    }).to.throw(Sequelize.ValidationError, '"foobar" is not a valid range');
                });

                it("should throw an error if `value.inclusive` is not an array with two elements", () => {
                    const type = new DataTypes.RANGE();

                    expect(() => {
                        type.validate({ inclusive: [1] });
                    }).to.throw(Sequelize.ValidationError, "A range must be an array with two elements");
                });

                it("should return `true` if `value` is a range", () => {
                    const type = new DataTypes.RANGE();

                    expect(type.validate([1, 2])).to.equal(true);
                });

                it("should return `true` if `value.inclusive` is a range", () => {
                    const type = new DataTypes.RANGE();

                    expect(type.validate({ inclusive: [1, 2] })).to.equal(true);
                });
            });
        });

        if (current.dialect.supports.ARRAY) {
            describe("ARRAY", () => {
                testsql("ARRAY(VARCHAR)", new DataTypes.ARRAY(DataTypes.STRING), {
                    postgres: "VARCHAR(255)[]"
                });

                testsql("ARRAY(VARCHAR(100))", new DataTypes.ARRAY(new DataTypes.STRING(100)), {
                    postgres: "VARCHAR(100)[]"
                });

                testsql("ARRAY(INTEGER)", new DataTypes.ARRAY(DataTypes.INTEGER), {
                    postgres: "INTEGER[]"
                });

                testsql("ARRAY(HSTORE)", new DataTypes.ARRAY(DataTypes.HSTORE), {
                    postgres: "HSTORE[]"
                });

                testsql("ARRAY(ARRAY(VARCHAR(255)))", new DataTypes.ARRAY(new DataTypes.ARRAY(DataTypes.STRING)), {
                    postgres: "VARCHAR(255)[][]"
                });

                testsql("ARRAY(TEXT)", new DataTypes.ARRAY(DataTypes.TEXT), {
                    postgres: "TEXT[]"
                });

                testsql("ARRAY(DATE)", new DataTypes.ARRAY(DataTypes.DATE), {
                    postgres: "TIMESTAMP WITH TIME ZONE[]"
                });

                testsql("ARRAY(BOOLEAN)", new DataTypes.ARRAY(DataTypes.BOOLEAN), {
                    postgres: "BOOLEAN[]"
                });

                testsql("ARRAY(DECIMAL)", new DataTypes.ARRAY(DataTypes.DECIMAL), {
                    postgres: "DECIMAL[]"
                });

                testsql("ARRAY(DECIMAL(6))", new DataTypes.ARRAY(new DataTypes.DECIMAL(6)), {
                    postgres: "DECIMAL(6)[]"
                });

                testsql("ARRAY(DECIMAL(6,4))", new DataTypes.ARRAY(new DataTypes.DECIMAL(6, 4)), {
                    postgres: "DECIMAL(6,4)[]"
                });

                testsql("ARRAY(DOUBLE)", new DataTypes.ARRAY(DataTypes.DOUBLE), {
                    postgres: "DOUBLE PRECISION[]"
                });

                testsql("ARRAY(REAL))", new DataTypes.ARRAY(DataTypes.REAL), {
                    postgres: "REAL[]"
                });

                if (current.dialect.supports.JSON) {
                    testsql("ARRAY(JSON)", new DataTypes.ARRAY(DataTypes.JSON), {
                        postgres: "JSON[]"
                    });
                }

                if (current.dialect.supports.JSONB) {
                    testsql("ARRAY(JSONB)", new DataTypes.ARRAY(DataTypes.JSONB), {
                        postgres: "JSONB[]"
                    });
                }

                describe("validate", () => {
                    it("should throw an error if `value` is invalid", () => {
                        const type = new DataTypes.ARRAY();

                        expect(() => {
                            type.validate("foobar");
                        }).to.throw(Sequelize.ValidationError, '"foobar" is not a valid array');
                    });

                    it("should return `true` if `value` is an array", () => {
                        const type = new DataTypes.ARRAY();

                        expect(type.validate(["foo", "bar"])).to.equal(true);
                    });
                });
            });
        }

        if (current.dialect.supports.GEOMETRY) {
            describe("GEOMETRY", () => {
                testsql("GEOMETRY", DataTypes.GEOMETRY, {
                    default: "GEOMETRY"
                });

                testsql("GEOMETRY('POINT')", new DataTypes.GEOMETRY("POINT"), {
                    postgres: "GEOMETRY(POINT)",
                    mysql: "POINT"
                });

                testsql("GEOMETRY('LINESTRING')", new DataTypes.GEOMETRY("LINESTRING"), {
                    postgres: "GEOMETRY(LINESTRING)",
                    mysql: "LINESTRING"
                });

                testsql("GEOMETRY('POLYGON')", new DataTypes.GEOMETRY("POLYGON"), {
                    postgres: "GEOMETRY(POLYGON)",
                    mysql: "POLYGON"
                });

                testsql("GEOMETRY('POINT',4326)", new DataTypes.GEOMETRY("POINT", 4326), {
                    postgres: "GEOMETRY(POINT,4326)",
                    mysql: "POINT"
                });
            });
        }
    });
});
