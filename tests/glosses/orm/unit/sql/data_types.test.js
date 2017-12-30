// Notice: [] will be replaced by dialect specific tick/quote character when there is not dialect specific expectation but only a default expectation
describe("data types", function () {
    const { orm, std: { util } } = adone;
    const { type } = orm;
    const expectsql = this.expectsql;
    const current = this.sequelize;

    const testsql = function (description, dataType, expectation) {
        it(description, () => {
            return expectsql(current.normalizeDataType(dataType).toSql(), expectation);
        });
    };

    describe("STRING", () => {
        testsql("STRING", type.STRING, {
            default: "VARCHAR(255)",
            mssql: "NVARCHAR(255)"
        });

        testsql("STRING(1234)", new type.STRING(1234), {
            default: "VARCHAR(1234)",
            mssql: "NVARCHAR(1234)"
        });

        testsql("STRING({ length: 1234 })", new type.STRING({ length: 1234 }), {
            default: "VARCHAR(1234)",
            mssql: "NVARCHAR(1234)"
        });

        testsql("STRING(1234).BINARY", new type.STRING(1234).BINARY, {
            default: "VARCHAR(1234) BINARY",
            sqlite: "VARCHAR BINARY(1234)",
            mssql: "BINARY(1234)",
            postgres: "BYTEA"
        });

        testsql("STRING.BINARY", type.STRING.BINARY, {
            default: "VARCHAR(255) BINARY",
            sqlite: "VARCHAR BINARY(255)",
            mssql: "BINARY(255)",
            postgres: "BYTEA"
        });

        describe("validate", () => {
            it("should return `true` if `value` is a string", () => {
                const t = new type.STRING();

                expect(t.validate("foobar")).to.equal(true);
                expect(t.validate(new String("foobar"))).to.equal(true);
                expect(t.validate(12)).to.equal(true);
            });
        });
    });

    describe("TEXT", () => {
        testsql("TEXT", type.TEXT, {
            default: "TEXT",
            mssql: "NVARCHAR(MAX)" // in mssql text is actually representing a non unicode text field
        });

        testsql('TEXT("tiny")', new type.TEXT("tiny"), {
            default: "TEXT",
            mssql: "NVARCHAR(256)",
            mysql: "TINYTEXT"
        });

        testsql('TEXT({ length: "tiny" })', new type.TEXT({ length: "tiny" }), {
            default: "TEXT",
            mssql: "NVARCHAR(256)",
            mysql: "TINYTEXT"
        });

        testsql('TEXT("medium")', new type.TEXT("medium"), {
            default: "TEXT",
            mssql: "NVARCHAR(MAX)",
            mysql: "MEDIUMTEXT"
        });

        testsql('TEXT("long")', new type.TEXT("long"), {
            default: "TEXT",
            mssql: "NVARCHAR(MAX)",
            mysql: "LONGTEXT"
        });

        describe("validate", () => {
            it("should throw an error if `value` is invalid", () => {
                const t = new type.TEXT();

                expect(() => {
                    t.validate(12345);
                }).to.throw(orm.x.ValidationError, "12345 is not a valid string");
            });

            it("should return `true` if `value` is a string", () => {
                const t = new type.TEXT();

                expect(t.validate("foobar")).to.equal(true);
            });
        });
    });

    describe("CHAR", () => {
        testsql("CHAR", type.CHAR, {
            default: "CHAR(255)"
        });

        testsql("CHAR(12)", new type.CHAR(12), {
            default: "CHAR(12)"
        });

        testsql("CHAR({ length: 12 })", new type.CHAR({ length: 12 }), {
            default: "CHAR(12)"
        });

        testsql("CHAR(12).BINARY", new type.CHAR(12).BINARY, {
            default: "CHAR(12) BINARY",
            sqlite: "CHAR BINARY(12)",
            postgres: "BYTEA"
        });

        testsql("CHAR.BINARY", type.CHAR.BINARY, {
            default: "CHAR(255) BINARY",
            sqlite: "CHAR BINARY(255)",
            postgres: "BYTEA"
        });
    });

    describe("BOOLEAN", () => {
        testsql("BOOLEAN", type.BOOLEAN, {
            postgres: "BOOLEAN",
            mssql: "BIT",
            mysql: "TINYINT(1)",
            sqlite: "TINYINT(1)"
        });

        describe("validate", () => {
            it("should throw an error if `value` is invalid", () => {
                const t = new type.BOOLEAN();

                expect(() => {
                    t.validate(12345);
                }).to.throw(orm.x.ValidationError, "12345 is not a valid boolean");
            });

            it("should return `true` if `value` is a boolean", () => {
                const t = new type.BOOLEAN();

                expect(t.validate(true)).to.equal(true);
                expect(t.validate(false)).to.equal(true);
                expect(t.validate("1")).to.equal(true);
                expect(t.validate("0")).to.equal(true);
                expect(t.validate("true")).to.equal(true);
                expect(t.validate("false")).to.equal(true);
            });
        });
    });

    describe("DATE", () => {
        testsql("DATE", type.DATE, {
            postgres: "TIMESTAMP WITH TIME ZONE",
            mssql: "DATETIMEOFFSET",
            mysql: "DATETIME",
            sqlite: "DATETIME"
        });

        testsql("DATE(6)", new type.DATE(6), {
            postgres: "TIMESTAMP WITH TIME ZONE",
            mssql: "DATETIMEOFFSET",
            mysql: "DATETIME(6)",
            sqlite: "DATETIME"
        });

        describe("validate", () => {
            it("should throw an error if `value` is invalid", () => {
                const t = new type.DATE();

                expect(() => {
                    t.validate("foobar");
                }).to.throw(orm.x.ValidationError, '"foobar" is not a valid date');
            });

            it("should return `true` if `value` is a date", () => {
                const t = new type.DATE();

                expect(t.validate(new Date())).to.equal(true);
            });
        });
    });

    if (current.dialect.supports.HSTORE) {
        describe("HSTORE", () => {
            describe("validate", () => {
                it("should throw an error if `value` is invalid", () => {
                    const t = new type.HSTORE();

                    expect(() => {
                        t.validate("foobar");
                    }).to.throw(orm.x.ValidationError, '"foobar" is not a valid hstore');
                });

                it("should return `true` if `value` is an hstore", () => {
                    const t = new type.HSTORE();

                    expect(t.validate({ foo: "bar" })).to.equal(true);
                });
            });
        });
    }

    describe("UUID", () => {
        testsql("UUID", type.UUID, {
            postgres: "UUID",
            mssql: "CHAR(36)",
            mysql: "CHAR(36) BINARY",
            sqlite: "UUID"
        });

        describe("validate", () => {
            it("should throw an error if `value` is invalid", () => {
                const t = new type.UUID();

                expect(() => {
                    t.validate("foobar");
                }).to.throw(orm.x.ValidationError, '"foobar" is not a valid uuid');

                expect(() => {
                    t.validate(["foobar"]);
                }).to.throw(orm.x.ValidationError, '["foobar"] is not a valid uuid');
            });

            it("should return `true` if `value` is an uuid", () => {
                const t = new type.UUID();

                expect(t.validate(adone.util.uuid.v4())).to.equal(true);
            });

            it("should return `true` if `value` is a string and we accept strings", () => {
                const t = new type.UUID();

                expect(t.validate("foobar", { acceptStrings: true })).to.equal(true);
            });
        });
    });

    describe("UUIDV1", () => {
        testsql("UUIDV1", type.UUIDV1, {
            default: "UUIDV1"
        });

        describe("validate", () => {
            it("should throw an error if `value` is invalid", () => {
                const t = new type.UUIDV1();

                expect(() => {
                    t.validate("foobar");
                }).to.throw(orm.x.ValidationError, '"foobar" is not a valid uuid');

                expect(() => {
                    t.validate(["foobar"]);
                }).to.throw(orm.x.ValidationError, '["foobar"] is not a valid uuid');
            });

            it("should return `true` if `value` is an uuid", () => {
                const t = new type.UUIDV1();

                expect(t.validate(adone.util.uuid.v1())).to.equal(true);
            });

            it("should return `true` if `value` is a string and we accept strings", () => {
                const t = new type.UUIDV1();

                expect(t.validate("foobar", { acceptStrings: true })).to.equal(true);
            });
        });
    });

    describe("UUIDV4", () => {
        testsql("UUIDV4", type.UUIDV4, {
            default: "UUIDV4"
        });

        describe("validate", () => {
            it("should throw an error if `value` is invalid", () => {
                const t = new type.UUIDV4();
                const value = adone.util.uuid.v1();

                expect(() => {
                    t.validate(value);
                }).to.throw(orm.x.ValidationError, util.format("%j is not a valid uuidv4", value));

                expect(() => {
                    t.validate(["foobar"]);
                }).to.throw(orm.x.ValidationError, '["foobar"] is not a valid uuidv4');
            });

            it("should return `true` if `value` is an uuid", () => {
                const t = new type.UUIDV4();

                expect(t.validate(adone.util.uuid.v4())).to.equal(true);
            });

            it("should return `true` if `value` is a string and we accept strings", () => {
                const t = new type.UUIDV4();

                expect(t.validate("foobar", { acceptStrings: true })).to.equal(true);
            });
        });
    });

    describe("NOW", () => {
        testsql("NOW", type.NOW, {
            default: "NOW",
            mssql: "GETDATE()"
        });
    });

    describe("INTEGER", () => {
        testsql("INTEGER", type.INTEGER, {
            default: "INTEGER"
        });

        testsql("INTEGER.UNSIGNED", type.INTEGER.UNSIGNED, {
            default: "INTEGER UNSIGNED",
            postgres: "INTEGER",
            mssql: "INTEGER"
        });

        testsql("INTEGER.UNSIGNED.ZEROFILL", type.INTEGER.UNSIGNED.ZEROFILL, {
            default: "INTEGER UNSIGNED ZEROFILL",
            postgres: "INTEGER",
            mssql: "INTEGER"
        });

        testsql("INTEGER(11)", new type.INTEGER(11), {
            default: "INTEGER(11)",
            postgres: "INTEGER",
            mssql: "INTEGER"
        });

        testsql("INTEGER({ length: 11 })", new type.INTEGER({ length: 11 }), {
            default: "INTEGER(11)",
            postgres: "INTEGER",
            mssql: "INTEGER"
        });

        testsql("INTEGER(11).UNSIGNED", new type.INTEGER(11).UNSIGNED, {
            default: "INTEGER(11) UNSIGNED",
            sqlite: "INTEGER UNSIGNED(11)",
            postgres: "INTEGER",
            mssql: "INTEGER"
        });

        testsql("INTEGER(11).UNSIGNED.ZEROFILL", new type.INTEGER(11).UNSIGNED.ZEROFILL, {
            default: "INTEGER(11) UNSIGNED ZEROFILL",
            sqlite: "INTEGER UNSIGNED ZEROFILL(11)",
            postgres: "INTEGER",
            mssql: "INTEGER"
        });

        testsql("INTEGER(11).ZEROFILL", new type.INTEGER(11).ZEROFILL, {
            default: "INTEGER(11) ZEROFILL",
            sqlite: "INTEGER ZEROFILL(11)",
            postgres: "INTEGER",
            mssql: "INTEGER"
        });

        testsql("INTEGER(11).ZEROFILL.UNSIGNED", new type.INTEGER(11).ZEROFILL.UNSIGNED, {
            default: "INTEGER(11) UNSIGNED ZEROFILL",
            sqlite: "INTEGER UNSIGNED ZEROFILL(11)",
            postgres: "INTEGER",
            mssql: "INTEGER"
        });

        describe("validate", () => {
            it("should throw an error if `value` is invalid", () => {
                const t = new type.INTEGER();

                expect(() => {
                    t.validate("foobar");
                }).to.throw(orm.x.ValidationError, '"foobar" is not a valid integer');

                expect(() => {
                    t.validate("123.45");
                }).to.throw(orm.x.ValidationError, '"123.45" is not a valid integer');

                expect(() => {
                    t.validate(123.45);
                }).to.throw(orm.x.ValidationError, "123.45 is not a valid integer");
            });

            it("should return `true` if `value` is a valid integer", () => {
                const t = new type.INTEGER();

                expect(t.validate("12345")).to.equal(true);
                expect(t.validate(12345)).to.equal(true);
            });
        });
    });

    describe("TINYINT", () => {
        const cases = [
            {
                title: "TINYINT",
                dataType: type.TINYINT,
                expect: {
                    default: "TINYINT"
                }
            },
            {
                title: "TINYINT(2)",
                dataType: new type.TINYINT(2),
                expect: {
                    default: "TINYINT(2)",
                    mssql: "TINYINT"
                }
            },
            {
                title: "TINYINT({ length: 2 })",
                dataType: new type.TINYINT({ length: 2 }),
                expect: {
                    default: "TINYINT(2)",
                    mssql: "TINYINT"
                }
            },
            {
                title: "TINYINT.UNSIGNED",
                dataType: type.TINYINT.UNSIGNED,
                expect: {
                    default: "TINYINT UNSIGNED",
                    mssql: "TINYINT"
                }
            },
            {
                title: "TINYINT(2).UNSIGNED",
                dataType: new type.TINYINT(2).UNSIGNED,
                expect: {
                    default: "TINYINT(2) UNSIGNED",
                    sqlite: "TINYINT UNSIGNED(2)",
                    mssql: "TINYINT"
                }
            },
            {
                title: "TINYINT.UNSIGNED.ZEROFILL",
                dataType: type.TINYINT.UNSIGNED.ZEROFILL,
                expect: {
                    default: "TINYINT UNSIGNED ZEROFILL",
                    mssql: "TINYINT"
                }
            },
            {
                title: "TINYINT(2).UNSIGNED.ZEROFILL",
                dataType: new type.TINYINT(2).UNSIGNED.ZEROFILL,
                expect: {
                    default: "TINYINT(2) UNSIGNED ZEROFILL",
                    sqlite: "TINYINT UNSIGNED ZEROFILL(2)",
                    mssql: "TINYINT"
                }
            },
            {
                title: "TINYINT.ZEROFILL",
                dataType: type.TINYINT.ZEROFILL,
                expect: {
                    default: "TINYINT ZEROFILL",
                    mssql: "TINYINT"
                }
            },
            {
                title: "TINYINT(2).ZEROFILL",
                dataType: new type.TINYINT(2).ZEROFILL,
                expect: {
                    default: "TINYINT(2) ZEROFILL",
                    sqlite: "TINYINT ZEROFILL(2)",
                    mssql: "TINYINT"
                }
            },
            {
                title: "TINYINT.ZEROFILL.UNSIGNED",
                dataType: type.TINYINT.ZEROFILL.UNSIGNED,
                expect: {
                    default: "TINYINT UNSIGNED ZEROFILL",
                    mssql: "TINYINT"
                }
            },
            {
                title: "TINYINT(2).ZEROFILL.UNSIGNED",
                dataType: new type.TINYINT(2).ZEROFILL.UNSIGNED,
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
                const t = new type.TINYINT();

                expect(() => {
                    t.validate("foobar");
                }).to.throw(orm.x.ValidationError, '"foobar" is not a valid tinyint');

                expect(() => {
                    t.validate(123.45);
                }).to.throw(orm.x.ValidationError, "123.45 is not a valid tinyint");
            });

            it("should return `true` if `value` is an integer", () => {
                const t = new type.TINYINT();

                expect(t.validate(-128)).to.equal(true);
                expect(t.validate("127")).to.equal(true);
            });
        });
    });

    describe("SMALLINT", () => {
        const cases = [
            {
                title: "SMALLINT",
                dataType: type.SMALLINT,
                expect: {
                    default: "SMALLINT"
                }
            },
            {
                title: "SMALLINT(4)",
                dataType: new type.SMALLINT(4),
                expect: {
                    default: "SMALLINT(4)",
                    postgres: "SMALLINT",
                    mssql: "SMALLINT"
                }
            },
            {
                title: "SMALLINT({ length: 4 })",
                dataType: new type.SMALLINT({ length: 4 }),
                expect: {
                    default: "SMALLINT(4)",
                    postgres: "SMALLINT",
                    mssql: "SMALLINT"
                }
            },
            {
                title: "SMALLINT.UNSIGNED",
                dataType: type.SMALLINT.UNSIGNED,
                expect: {
                    default: "SMALLINT UNSIGNED",
                    postgres: "SMALLINT",
                    mssql: "SMALLINT"
                }
            },
            {
                title: "SMALLINT(4).UNSIGNED",
                dataType: new type.SMALLINT(4).UNSIGNED,
                expect: {
                    default: "SMALLINT(4) UNSIGNED",
                    sqlite: "SMALLINT UNSIGNED(4)",
                    postgres: "SMALLINT",
                    mssql: "SMALLINT"
                }
            },
            {
                title: "SMALLINT.UNSIGNED.ZEROFILL",
                dataType: type.SMALLINT.UNSIGNED.ZEROFILL,
                expect: {
                    default: "SMALLINT UNSIGNED ZEROFILL",
                    postgres: "SMALLINT",
                    mssql: "SMALLINT"
                }
            },
            {
                title: "SMALLINT(4).UNSIGNED.ZEROFILL",
                dataType: new type.SMALLINT(4).UNSIGNED.ZEROFILL,
                expect: {
                    default: "SMALLINT(4) UNSIGNED ZEROFILL",
                    sqlite: "SMALLINT UNSIGNED ZEROFILL(4)",
                    postgres: "SMALLINT",
                    mssql: "SMALLINT"
                }
            },
            {
                title: "SMALLINT.ZEROFILL",
                dataType: type.SMALLINT.ZEROFILL,
                expect: {
                    default: "SMALLINT ZEROFILL",
                    postgres: "SMALLINT",
                    mssql: "SMALLINT"
                }
            },
            {
                title: "SMALLINT(4).ZEROFILL",
                dataType: new type.SMALLINT(4).ZEROFILL,
                expect: {
                    default: "SMALLINT(4) ZEROFILL",
                    sqlite: "SMALLINT ZEROFILL(4)",
                    postgres: "SMALLINT",
                    mssql: "SMALLINT"
                }
            },
            {
                title: "SMALLINT.ZEROFILL.UNSIGNED",
                dataType: type.SMALLINT.ZEROFILL.UNSIGNED,
                expect: {
                    default: "SMALLINT UNSIGNED ZEROFILL",
                    postgres: "SMALLINT",
                    mssql: "SMALLINT"
                }
            },
            {
                title: "SMALLINT(4).ZEROFILL.UNSIGNED",
                dataType: new type.SMALLINT(4).ZEROFILL.UNSIGNED,
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
                const t = new type.SMALLINT();

                expect(() => {
                    t.validate("foobar");
                }).to.throw(orm.x.ValidationError, '"foobar" is not a valid smallint');

                expect(() => {
                    t.validate(123.45);
                }).to.throw(orm.x.ValidationError, "123.45 is not a valid smallint");
            });

            it("should return `true` if `value` is an integer", () => {
                const t = new type.SMALLINT();

                expect(t.validate(-32768)).to.equal(true);
                expect(t.validate("32767")).to.equal(true);
            });
        });
    });

    describe("MEDIUMINT", () => {
        const cases = [
            {
                title: "MEDIUMINT",
                dataType: type.MEDIUMINT,
                expect: {
                    default: "MEDIUMINT"
                }
            },
            {
                title: "MEDIUMINT(6)",
                dataType: new type.MEDIUMINT(6),
                expect: {
                    default: "MEDIUMINT(6)"
                }
            },
            {
                title: "MEDIUMINT({ length: 6 })",
                dataType: new type.MEDIUMINT({ length: 6 }),
                expect: {
                    default: "MEDIUMINT(6)"
                }
            },
            {
                title: "MEDIUMINT.UNSIGNED",
                dataType: type.MEDIUMINT.UNSIGNED,
                expect: {
                    default: "MEDIUMINT UNSIGNED"
                }
            },
            {
                title: "MEDIUMINT(6).UNSIGNED",
                dataType: new type.MEDIUMINT(6).UNSIGNED,
                expect: {
                    default: "MEDIUMINT(6) UNSIGNED",
                    sqlite: "MEDIUMINT UNSIGNED(6)"
                }
            },
            {
                title: "MEDIUMINT.UNSIGNED.ZEROFILL",
                dataType: type.MEDIUMINT.UNSIGNED.ZEROFILL,
                expect: {
                    default: "MEDIUMINT UNSIGNED ZEROFILL"
                }
            },
            {
                title: "MEDIUMINT(6).UNSIGNED.ZEROFILL",
                dataType: new type.MEDIUMINT(6).UNSIGNED.ZEROFILL,
                expect: {
                    default: "MEDIUMINT(6) UNSIGNED ZEROFILL",
                    sqlite: "MEDIUMINT UNSIGNED ZEROFILL(6)"
                }
            },
            {
                title: "MEDIUMINT.ZEROFILL",
                dataType: type.MEDIUMINT.ZEROFILL,
                expect: {
                    default: "MEDIUMINT ZEROFILL"
                }
            },
            {
                title: "MEDIUMINT(6).ZEROFILL",
                dataType: new type.MEDIUMINT(6).ZEROFILL,
                expect: {
                    default: "MEDIUMINT(6) ZEROFILL",
                    sqlite: "MEDIUMINT ZEROFILL(6)"
                }
            },
            {
                title: "MEDIUMINT.ZEROFILL.UNSIGNED",
                dataType: type.MEDIUMINT.ZEROFILL.UNSIGNED,
                expect: {
                    default: "MEDIUMINT UNSIGNED ZEROFILL"
                }
            },
            {
                title: "MEDIUMINT(6).ZEROFILL.UNSIGNED",
                dataType: new type.MEDIUMINT(6).ZEROFILL.UNSIGNED,
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
                const t = new type.MEDIUMINT();

                expect(() => {
                    t.validate("foobar");
                }).to.throw(orm.x.ValidationError, '"foobar" is not a valid mediumint');

                expect(() => {
                    t.validate(123.45);
                }).to.throw(orm.x.ValidationError, "123.45 is not a valid mediumint");
            });

            it("should return `true` if `value` is an integer", () => {
                const t = new type.MEDIUMINT();

                expect(t.validate(-8388608)).to.equal(true);
                expect(t.validate("8388607")).to.equal(true);
            });
        });
    });

    describe("BIGINT", () => {
        testsql("BIGINT", type.BIGINT, {
            default: "BIGINT"
        });

        testsql("BIGINT.UNSIGNED", type.BIGINT.UNSIGNED, {
            default: "BIGINT UNSIGNED",
            postgres: "BIGINT",
            mssql: "BIGINT"
        });

        testsql("BIGINT.UNSIGNED.ZEROFILL", type.BIGINT.UNSIGNED.ZEROFILL, {
            default: "BIGINT UNSIGNED ZEROFILL",
            postgres: "BIGINT",
            mssql: "BIGINT"
        });

        testsql("BIGINT(11)", new type.BIGINT(11), {
            default: "BIGINT(11)",
            postgres: "BIGINT",
            mssql: "BIGINT"
        });

        testsql("BIGINT({ length: 11 })", new type.BIGINT({ length: 11 }), {
            default: "BIGINT(11)",
            postgres: "BIGINT",
            mssql: "BIGINT"
        });

        testsql("BIGINT(11).UNSIGNED", new type.BIGINT(11).UNSIGNED, {
            default: "BIGINT(11) UNSIGNED",
            sqlite: "BIGINT UNSIGNED(11)",
            postgres: "BIGINT",
            mssql: "BIGINT"
        });

        testsql("BIGINT(11).UNSIGNED.ZEROFILL", new type.BIGINT(11).UNSIGNED.ZEROFILL, {
            default: "BIGINT(11) UNSIGNED ZEROFILL",
            sqlite: "BIGINT UNSIGNED ZEROFILL(11)",
            postgres: "BIGINT",
            mssql: "BIGINT"
        });

        testsql("BIGINT(11).ZEROFILL", new type.BIGINT(11).ZEROFILL, {
            default: "BIGINT(11) ZEROFILL",
            sqlite: "BIGINT ZEROFILL(11)",
            postgres: "BIGINT",
            mssql: "BIGINT"
        });

        testsql("BIGINT(11).ZEROFILL.UNSIGNED", new type.BIGINT(11).ZEROFILL.UNSIGNED, {
            default: "BIGINT(11) UNSIGNED ZEROFILL",
            sqlite: "BIGINT UNSIGNED ZEROFILL(11)",
            postgres: "BIGINT",
            mssql: "BIGINT"
        });

        describe("validate", () => {
            it("should throw an error if `value` is invalid", () => {
                const t = new type.BIGINT();

                expect(() => {
                    t.validate("foobar");
                }).to.throw(orm.x.ValidationError, '"foobar" is not a valid bigint');

                expect(() => {
                    t.validate(123.45);
                }).to.throw(orm.x.ValidationError, "123.45 is not a valid bigint");
            });

            it("should return `true` if `value` is an integer", () => {
                const t = new type.BIGINT();

                expect(t.validate("9223372036854775807")).to.equal(true);
            });
        });
    });

    describe("REAL", () => {
        testsql("REAL", type.REAL, {
            default: "REAL"
        });

        testsql("REAL.UNSIGNED", type.REAL.UNSIGNED, {
            default: "REAL UNSIGNED",
            postgres: "REAL",
            mssql: "REAL"
        });

        testsql("REAL(11)", new type.REAL(11), {
            default: "REAL(11)",
            postgres: "REAL",
            mssql: "REAL"
        });

        testsql("REAL({ length: 11 })", new type.REAL({ length: 11 }), {
            default: "REAL(11)",
            postgres: "REAL",
            mssql: "REAL"
        });

        testsql("REAL(11).UNSIGNED", new type.REAL(11).UNSIGNED, {
            default: "REAL(11) UNSIGNED",
            sqlite: "REAL UNSIGNED(11)",
            postgres: "REAL",
            mssql: "REAL"
        });

        testsql("REAL(11).UNSIGNED.ZEROFILL", new type.REAL(11).UNSIGNED.ZEROFILL, {
            default: "REAL(11) UNSIGNED ZEROFILL",
            sqlite: "REAL UNSIGNED ZEROFILL(11)",
            postgres: "REAL",
            mssql: "REAL"
        });

        testsql("REAL(11).ZEROFILL", new type.REAL(11).ZEROFILL, {
            default: "REAL(11) ZEROFILL",
            sqlite: "REAL ZEROFILL(11)",
            postgres: "REAL",
            mssql: "REAL"
        });

        testsql("REAL(11).ZEROFILL.UNSIGNED", new type.REAL(11).ZEROFILL.UNSIGNED, {
            default: "REAL(11) UNSIGNED ZEROFILL",
            sqlite: "REAL UNSIGNED ZEROFILL(11)",
            postgres: "REAL",
            mssql: "REAL"
        });

        testsql("REAL(11, 12)", new type.REAL(11, 12), {
            default: "REAL(11,12)",
            postgres: "REAL",
            mssql: "REAL"
        });

        testsql("REAL(11, 12).UNSIGNED", new type.REAL(11, 12).UNSIGNED, {
            default: "REAL(11,12) UNSIGNED",
            sqlite: "REAL UNSIGNED(11,12)",
            postgres: "REAL",
            mssql: "REAL"
        });

        testsql("REAL({ length: 11, decimals: 12 }).UNSIGNED", new type.REAL({ length: 11, decimals: 12 }).UNSIGNED, {
            default: "REAL(11,12) UNSIGNED",
            sqlite: "REAL UNSIGNED(11,12)",
            postgres: "REAL",
            mssql: "REAL"
        });

        testsql("REAL(11, 12).UNSIGNED.ZEROFILL", new type.REAL(11, 12).UNSIGNED.ZEROFILL, {
            default: "REAL(11,12) UNSIGNED ZEROFILL",
            sqlite: "REAL UNSIGNED ZEROFILL(11,12)",
            postgres: "REAL",
            mssql: "REAL"
        });

        testsql("REAL(11, 12).ZEROFILL", new type.REAL(11, 12).ZEROFILL, {
            default: "REAL(11,12) ZEROFILL",
            sqlite: "REAL ZEROFILL(11,12)",
            postgres: "REAL",
            mssql: "REAL"
        });

        testsql("REAL(11, 12).ZEROFILL.UNSIGNED", new type.REAL(11, 12).ZEROFILL.UNSIGNED, {
            default: "REAL(11,12) UNSIGNED ZEROFILL",
            sqlite: "REAL UNSIGNED ZEROFILL(11,12)",
            postgres: "REAL",
            mssql: "REAL"
        });
    });

    describe("DOUBLE PRECISION", () => {
        testsql("DOUBLE", type.DOUBLE, {
            default: "DOUBLE PRECISION"
        });

        testsql("DOUBLE.UNSIGNED", type.DOUBLE.UNSIGNED, {
            default: "DOUBLE PRECISION UNSIGNED",
            postgres: "DOUBLE PRECISION"
        });

        testsql("DOUBLE(11)", new type.DOUBLE(11), {
            default: "DOUBLE PRECISION(11)",
            postgres: "DOUBLE PRECISION"
        });

        testsql("DOUBLE(11).UNSIGNED", new type.DOUBLE(11).UNSIGNED, {
            default: "DOUBLE PRECISION(11) UNSIGNED",
            sqlite: "DOUBLE PRECISION UNSIGNED(11)",
            postgres: "DOUBLE PRECISION"
        });

        testsql("DOUBLE({ length: 11 }).UNSIGNED", new type.DOUBLE({ length: 11 }).UNSIGNED, {
            default: "DOUBLE PRECISION(11) UNSIGNED",
            sqlite: "DOUBLE PRECISION UNSIGNED(11)",
            postgres: "DOUBLE PRECISION"
        });

        testsql("DOUBLE(11).UNSIGNED.ZEROFILL", new type.DOUBLE(11).UNSIGNED.ZEROFILL, {
            default: "DOUBLE PRECISION(11) UNSIGNED ZEROFILL",
            sqlite: "DOUBLE PRECISION UNSIGNED ZEROFILL(11)",
            postgres: "DOUBLE PRECISION"
        });

        testsql("DOUBLE(11).ZEROFILL", new type.DOUBLE(11).ZEROFILL, {
            default: "DOUBLE PRECISION(11) ZEROFILL",
            sqlite: "DOUBLE PRECISION ZEROFILL(11)",
            postgres: "DOUBLE PRECISION"
        });

        testsql("DOUBLE(11).ZEROFILL.UNSIGNED", new type.DOUBLE(11).ZEROFILL.UNSIGNED, {
            default: "DOUBLE PRECISION(11) UNSIGNED ZEROFILL",
            sqlite: "DOUBLE PRECISION UNSIGNED ZEROFILL(11)",
            postgres: "DOUBLE PRECISION"
        });

        testsql("DOUBLE(11, 12)", new type.DOUBLE(11, 12), {
            default: "DOUBLE PRECISION(11,12)",
            postgres: "DOUBLE PRECISION"
        });

        testsql("DOUBLE(11, 12).UNSIGNED", new type.DOUBLE(11, 12).UNSIGNED, {
            default: "DOUBLE PRECISION(11,12) UNSIGNED",
            sqlite: "DOUBLE PRECISION UNSIGNED(11,12)",
            postgres: "DOUBLE PRECISION"
        });

        testsql("DOUBLE(11, 12).UNSIGNED.ZEROFILL", new type.DOUBLE(11, 12).UNSIGNED.ZEROFILL, {
            default: "DOUBLE PRECISION(11,12) UNSIGNED ZEROFILL",
            sqlite: "DOUBLE PRECISION UNSIGNED ZEROFILL(11,12)",
            postgres: "DOUBLE PRECISION"
        });

        testsql("DOUBLE(11, 12).ZEROFILL", new type.DOUBLE(11, 12).ZEROFILL, {
            default: "DOUBLE PRECISION(11,12) ZEROFILL",
            sqlite: "DOUBLE PRECISION ZEROFILL(11,12)",
            postgres: "DOUBLE PRECISION"
        });

        testsql("DOUBLE(11, 12).ZEROFILL.UNSIGNED", new type.DOUBLE(11, 12).ZEROFILL.UNSIGNED, {
            default: "DOUBLE PRECISION(11,12) UNSIGNED ZEROFILL",
            sqlite: "DOUBLE PRECISION UNSIGNED ZEROFILL(11,12)",
            postgres: "DOUBLE PRECISION"
        });
    });

    describe("FLOAT", () => {
        testsql("FLOAT", type.FLOAT, {
            default: "FLOAT",
            postgres: "FLOAT"
        });

        testsql("FLOAT.UNSIGNED", type.FLOAT.UNSIGNED, {
            default: "FLOAT UNSIGNED",
            postgres: "FLOAT",
            mssql: "FLOAT"
        });

        testsql("FLOAT(11)", new type.FLOAT(11), {
            default: "FLOAT(11)",
            postgres: "FLOAT(11)", // 1-24 = 4 bytes; 35-53 = 8 bytes
            mssql: "FLOAT(11)" // 1-24 = 4 bytes; 35-53 = 8 bytes
        });

        testsql("FLOAT(11).UNSIGNED", new type.FLOAT(11).UNSIGNED, {
            default: "FLOAT(11) UNSIGNED",
            sqlite: "FLOAT UNSIGNED(11)",
            postgres: "FLOAT(11)",
            mssql: "FLOAT(11)"
        });

        testsql("FLOAT(11).UNSIGNED.ZEROFILL", new type.FLOAT(11).UNSIGNED.ZEROFILL, {
            default: "FLOAT(11) UNSIGNED ZEROFILL",
            sqlite: "FLOAT UNSIGNED ZEROFILL(11)",
            postgres: "FLOAT(11)",
            mssql: "FLOAT(11)"
        });

        testsql("FLOAT(11).ZEROFILL", new type.FLOAT(11).ZEROFILL, {
            default: "FLOAT(11) ZEROFILL",
            sqlite: "FLOAT ZEROFILL(11)",
            postgres: "FLOAT(11)",
            mssql: "FLOAT(11)"
        });

        testsql("FLOAT({ length: 11 }).ZEROFILL", new type.FLOAT({ length: 11 }).ZEROFILL, {
            default: "FLOAT(11) ZEROFILL",
            sqlite: "FLOAT ZEROFILL(11)",
            postgres: "FLOAT(11)",
            mssql: "FLOAT(11)"
        });

        testsql("FLOAT(11).ZEROFILL.UNSIGNED", new type.FLOAT(11).ZEROFILL.UNSIGNED, {
            default: "FLOAT(11) UNSIGNED ZEROFILL",
            sqlite: "FLOAT UNSIGNED ZEROFILL(11)",
            postgres: "FLOAT(11)",
            mssql: "FLOAT(11)"
        });

        testsql("FLOAT(11, 12)", new type.FLOAT(11, 12), {
            default: "FLOAT(11,12)",
            postgres: "FLOAT",
            mssql: "FLOAT"
        });

        testsql("FLOAT(11, 12).UNSIGNED", new type.FLOAT(11, 12).UNSIGNED, {
            default: "FLOAT(11,12) UNSIGNED",
            sqlite: "FLOAT UNSIGNED(11,12)",
            postgres: "FLOAT",
            mssql: "FLOAT"
        });

        testsql("FLOAT({ length: 11, decimals: 12 }).UNSIGNED", new type.FLOAT({ length: 11, decimals: 12 }).UNSIGNED, {
            default: "FLOAT(11,12) UNSIGNED",
            sqlite: "FLOAT UNSIGNED(11,12)",
            postgres: "FLOAT",
            mssql: "FLOAT"
        });

        testsql("FLOAT(11, 12).UNSIGNED.ZEROFILL", new type.FLOAT(11, 12).UNSIGNED.ZEROFILL, {
            default: "FLOAT(11,12) UNSIGNED ZEROFILL",
            sqlite: "FLOAT UNSIGNED ZEROFILL(11,12)",
            postgres: "FLOAT",
            mssql: "FLOAT"
        });

        testsql("FLOAT(11, 12).ZEROFILL", new type.FLOAT(11, 12).ZEROFILL, {
            default: "FLOAT(11,12) ZEROFILL",
            sqlite: "FLOAT ZEROFILL(11,12)",
            postgres: "FLOAT",
            mssql: "FLOAT"
        });

        testsql("FLOAT(11, 12).ZEROFILL.UNSIGNED", new type.FLOAT(11, 12).ZEROFILL.UNSIGNED, {
            default: "FLOAT(11,12) UNSIGNED ZEROFILL",
            sqlite: "FLOAT UNSIGNED ZEROFILL(11,12)",
            postgres: "FLOAT",
            mssql: "FLOAT"
        });

        describe("validate", () => {
            it("should throw an error if `value` is invalid", () => {
                const t = new type.FLOAT();

                expect(() => {
                    t.validate("foobar");
                }).to.throw(orm.x.ValidationError, '"foobar" is not a valid float');
            });

            it("should return `true` if `value` is a float", () => {
                const t = new type.FLOAT();

                expect(t.validate(1.2)).to.equal(true);
                expect(t.validate("1")).to.equal(true);
                expect(t.validate("1.2")).to.equal(true);
                expect(t.validate("-0.123")).to.equal(true);
                expect(t.validate("-0.22250738585072011e-307")).to.equal(true);
            });
        });
    });

    if (current.dialect.supports.NUMERIC) {
        testsql("NUMERIC", type.NUMERIC, {
            default: "DECIMAL"
        });

        testsql("NUMERIC(15,5)", new type.NUMERIC(15, 5), {
            default: "DECIMAL(15,5)"
        });
    }

    describe("DECIMAL", () => {
        testsql("DECIMAL", type.DECIMAL, {
            default: "DECIMAL"
        });

        testsql("DECIMAL(10, 2)", new type.DECIMAL(10, 2), {
            default: "DECIMAL(10,2)"
        });

        testsql("DECIMAL({ precision: 10, scale: 2 })", new type.DECIMAL({ precision: 10, scale: 2 }), {
            default: "DECIMAL(10,2)"
        });

        testsql("DECIMAL(10)", new type.DECIMAL(10), {
            default: "DECIMAL(10)"
        });

        testsql("DECIMAL({ precision: 10 })", new type.DECIMAL({ precision: 10 }), {
            default: "DECIMAL(10)"
        });

        testsql("DECIMAL.UNSIGNED", type.DECIMAL.UNSIGNED, {
            mysql: "DECIMAL UNSIGNED",
            default: "DECIMAL"
        });

        testsql("DECIMAL.UNSIGNED.ZEROFILL", type.DECIMAL.UNSIGNED.ZEROFILL, {
            mysql: "DECIMAL UNSIGNED ZEROFILL",
            default: "DECIMAL"
        });

        testsql("DECIMAL({ precision: 10, scale: 2 }).UNSIGNED", new type.DECIMAL({ precision: 10, scale: 2 }).UNSIGNED, {
            mysql: "DECIMAL(10,2) UNSIGNED",
            default: "DECIMAL(10,2)"
        });

        describe("validate", () => {
            it("should throw an error if `value` is invalid", () => {
                const t = new type.DECIMAL(10);

                expect(() => {
                    t.validate("foobar");
                }).to.throw(orm.x.ValidationError, '"foobar" is not a valid decimal');

                expect(() => {
                    t.validate("0.1a");
                }).to.throw(orm.x.ValidationError, '"0.1a" is not a valid decimal');

                expect(() => {
                    t.validate(NaN);
                }).to.throw(orm.x.ValidationError, "null is not a valid decimal");
            });

            it("should return `true` if `value` is a decimal", () => {
                const t = new type.DECIMAL(10);

                expect(t.validate(123)).to.equal(true);
                expect(t.validate(1.2)).to.equal(true);
                expect(t.validate(-0.25)).to.equal(true);
                expect(t.validate(0.0000000000001)).to.equal(true);
                expect(t.validate("123")).to.equal(true);
                expect(t.validate("1.2")).to.equal(true);
                expect(t.validate("-0.25")).to.equal(true);
                expect(t.validate("0.0000000000001")).to.equal(true);
            });
        });
    });

    describe("ENUM", () => {
        // TODO: Fix Enums and add more tests
        // testsql('ENUM("value 1", "value 2")', new type.ENUM('value 1', 'value 2'), {
        //   default: 'ENUM'
        // });

        describe("validate", () => {
            it("should throw an error if `value` is invalid", () => {
                const t = new type.ENUM("foo");

                expect(() => {
                    t.validate("foobar");
                }).to.throw(orm.x.ValidationError, '"foobar" is not a valid choice in ["foo"]');
            });

            it("should return `true` if `value` is a valid choice", () => {
                const t = new type.ENUM("foobar", "foobiz");

                expect(t.validate("foobar")).to.equal(true);
                expect(t.validate("foobiz")).to.equal(true);
            });
        });
    });

    describe("BLOB", () => {
        testsql("BLOB", type.BLOB, {
            default: "BLOB",
            mssql: "VARBINARY(MAX)",
            postgres: "BYTEA"
        });

        testsql('BLOB("tiny")', new type.BLOB("tiny"), {
            default: "TINYBLOB",
            mssql: "VARBINARY(256)",
            postgres: "BYTEA"
        });

        testsql('BLOB("medium")', new type.BLOB("medium"), {
            default: "MEDIUMBLOB",
            mssql: "VARBINARY(MAX)",
            postgres: "BYTEA"
        });

        testsql('BLOB({ length: "medium" })', new type.BLOB({ length: "medium" }), {
            default: "MEDIUMBLOB",
            mssql: "VARBINARY(MAX)",
            postgres: "BYTEA"
        });

        testsql('BLOB("long")', new type.BLOB("long"), {
            default: "LONGBLOB",
            mssql: "VARBINARY(MAX)",
            postgres: "BYTEA"
        });

        describe("validate", () => {
            it("should throw an error if `value` is invalid", () => {
                const t = new type.BLOB();

                expect(() => {
                    t.validate(12345);
                }).to.throw(orm.x.ValidationError, "12345 is not a valid blob");
            });

            it("should return `true` if `value` is a blob", () => {
                const t = new type.BLOB();

                expect(t.validate("foobar")).to.equal(true);
                expect(t.validate(Buffer.from("foobar"))).to.equal(true);
            });
        });
    });

    describe("RANGE", () => {
        describe("validate", () => {
            it("should throw an error if `value` is invalid", () => {
                const t = new type.RANGE();

                expect(() => {
                    t.validate("foobar");
                }).to.throw(orm.x.ValidationError, '"foobar" is not a valid range');
            });

            it("should throw an error if `value` is not an array with two elements", () => {
                const t = new type.RANGE();

                expect(() => {
                    t.validate([1]);
                }).to.throw(orm.x.ValidationError, "A range must be an array with two elements");
            });

            it("should throw an error if `value.inclusive` is invalid", () => {
                const t = new type.RANGE();

                expect(() => {
                    t.validate({ inclusive: "foobar" });
                }).to.throw(orm.x.ValidationError, '"foobar" is not a valid range');
            });

            it("should throw an error if `value.inclusive` is not an array with two elements", () => {
                const t = new type.RANGE();

                expect(() => {
                    t.validate({ inclusive: [1] });
                }).to.throw(orm.x.ValidationError, "A range must be an array with two elements");
            });

            it("should return `true` if `value` is a range", () => {
                const t = new type.RANGE();

                expect(t.validate([1, 2])).to.equal(true);
            });

            it("should return `true` if `value.inclusive` is a range", () => {
                const t = new type.RANGE();

                expect(t.validate({ inclusive: [1, 2] })).to.equal(true);
            });
        });
    });

    if (current.dialect.supports.ARRAY) {
        describe("ARRAY", () => {
            testsql("ARRAY(VARCHAR)", new type.ARRAY(type.STRING), {
                postgres: "VARCHAR(255)[]"
            });

            testsql("ARRAY(VARCHAR(100))", new type.ARRAY(new type.STRING(100)), {
                postgres: "VARCHAR(100)[]"
            });

            testsql("ARRAY(INTEGER)", new type.ARRAY(type.INTEGER), {
                postgres: "INTEGER[]"
            });

            testsql("ARRAY(HSTORE)", new type.ARRAY(type.HSTORE), {
                postgres: "HSTORE[]"
            });

            testsql("ARRAY(ARRAY(VARCHAR(255)))", new type.ARRAY(new type.ARRAY(type.STRING)), {
                postgres: "VARCHAR(255)[][]"
            });

            testsql("ARRAY(TEXT)", new type.ARRAY(type.TEXT), {
                postgres: "TEXT[]"
            });

            testsql("ARRAY(DATE)", new type.ARRAY(type.DATE), {
                postgres: "TIMESTAMP WITH TIME ZONE[]"
            });

            testsql("ARRAY(BOOLEAN)", new type.ARRAY(type.BOOLEAN), {
                postgres: "BOOLEAN[]"
            });

            testsql("ARRAY(DECIMAL)", new type.ARRAY(type.DECIMAL), {
                postgres: "DECIMAL[]"
            });

            testsql("ARRAY(DECIMAL(6))", new type.ARRAY(new type.DECIMAL(6)), {
                postgres: "DECIMAL(6)[]"
            });

            testsql("ARRAY(DECIMAL(6,4))", new type.ARRAY(new type.DECIMAL(6, 4)), {
                postgres: "DECIMAL(6,4)[]"
            });

            testsql("ARRAY(DOUBLE)", new type.ARRAY(type.DOUBLE), {
                postgres: "DOUBLE PRECISION[]"
            });

            testsql("ARRAY(REAL))", new type.ARRAY(type.REAL), {
                postgres: "REAL[]"
            });

            if (current.dialect.supports.JSON) {
                testsql("ARRAY(JSON)", new type.ARRAY(type.JSON), {
                    postgres: "JSON[]"
                });
            }

            if (current.dialect.supports.JSONB) {
                testsql("ARRAY(JSONB)", new type.ARRAY(type.JSONB), {
                    postgres: "JSONB[]"
                });
            }

            describe("validate", () => {
                it("should throw an error if `value` is invalid", () => {
                    const t = new type.ARRAY();

                    expect(() => {
                        t.validate("foobar");
                    }).to.throw(orm.x.ValidationError, '"foobar" is not a valid array');
                });

                it("should return `true` if `value` is an array", () => {
                    const t = new type.ARRAY();

                    expect(t.validate(["foo", "bar"])).to.equal(true);
                });
            });
        });
    }

    if (current.dialect.supports.GEOMETRY) {
        describe("GEOMETRY", () => {
            testsql("GEOMETRY", type.GEOMETRY, {
                default: "GEOMETRY"
            });

            testsql("GEOMETRY('POINT')", new type.GEOMETRY("POINT"), {
                postgres: "GEOMETRY(POINT)",
                mysql: "POINT"
            });

            testsql("GEOMETRY('LINESTRING')", new type.GEOMETRY("LINESTRING"), {
                postgres: "GEOMETRY(LINESTRING)",
                mysql: "LINESTRING"
            });

            testsql("GEOMETRY('POLYGON')", new type.GEOMETRY("POLYGON"), {
                postgres: "GEOMETRY(POLYGON)",
                mysql: "POLYGON"
            });

            testsql("GEOMETRY('POINT',4326)", new type.GEOMETRY("POINT", 4326), {
                postgres: "GEOMETRY(POINT,4326)",
                mysql: "POINT"
            });
        });
    }
});
