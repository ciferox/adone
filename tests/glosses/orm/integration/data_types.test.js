import Support from "./support";

const { vendor: { lodash: _ } } = adone;
const current = Support.sequelize;
const { orm } = adone;
const { type } = orm;
const dialect = Support.getTestDialect();

describe(Support.getTestDialectTeaser("DataTypes"), () => {
    afterEach(function () {
        // Restore some sanity by resetting all parsers
        switch (dialect) {
            case "postgres": {
                const types = require("pg-types");

                _.each(type, (dataType) => {
                    if (dataType.types && dataType.types.postgres) {
                        dataType.types.postgres.oids.forEach((oid) => {
                            types.setTypeParser(oid, _.identity);
                        });
                    }
                });

                require("pg-types/lib/binaryParsers").init((oid, converter) => {
                    types.setTypeParser(oid, "binary", converter);
                });
                require("pg-types/lib/textParsers").init((oid, converter) => {
                    types.setTypeParser(oid, "text", converter);
                });
                break;
            }
            default:
                this.sequelize.connectionManager._clearTypeParser();
        }

        this.sequelize.connectionManager.refreshTypeParser(type[dialect]); // Reload custom parsers
    });

    it("allows me to return values from a custom parse function", () => {
        const parse = type.DATE.parse = spy((value) => {
            return adone.datetime(value, "YYYY-MM-DD HH:mm:ss");
        });

        const stringify = type.DATE.prototype.stringify = spy(function (value, options) {
            if (!adone.is.datetime(value)) {
                value = this._applyTimezone(value, options);
            }
            return value.format("YYYY-MM-DD HH:mm:ss");
        });

        current.refreshTypes();

        const User = current.define("user", {
            dateField: type.DATE
        }, {
            timestamps: false
        });

        return current.sync({ force: true }).then(() => {
            return User.create({
                dateField: adone.datetime("2011 10 31", "YYYY MM DD")
            });
        }).then(() => {
            return User.findAll();
        }).then(([user]) => {
            expect(parse).to.have.been.called;
            expect(stringify).to.have.been.called;

            expect(adone.is.datetime(user.dateField)).to.be.ok;

            delete type.DATE.parse;
        });
    });

    const testSuccess = function (Type, value) {
        const parse = Type.constructor.parse = spy((value) => {
            return value;
        });

        const stringify = Type.constructor.prototype.stringify = spy(function (...args) {
            return type.ABSTRACT.prototype.stringify.apply(this, args);
        });

        current.refreshTypes();

        const User = current.define("user", {
            field: Type
        }, {
            timestamps: false
        });

        return current.sync({ force: true }).then(() => {
            return User.create({
                field: value
            });
        }).then(() => {
            return User.findAll();
        }).then(() => {
            expect(parse).to.have.been.called;
            expect(stringify).to.have.been.called;

            delete Type.constructor.parse;
            delete Type.constructor.prototype.stringify;
        });
    };

    const testFailure = function (Type) {
        Type.constructor.parse = _.noop();

        expect(() => {
            current.refreshTypes();
        }).to.throw(`Parse function not supported for type ${Type.key} in dialect ${dialect}`);

        delete Type.constructor.parse;
    };

    if (current.dialect.supports.JSON) {
        it("calls parse and stringify for JSON", () => {
            const Type = new type.JSON();

            return testSuccess(Type, { test: 42, nested: { foo: "bar" } });
        });
    }

    if (current.dialect.supports.JSONB) {
        it("calls parse and stringify for JSONB", () => {
            const Type = new type.JSONB();

            return testSuccess(Type, { test: 42, nested: { foo: "bar" } });
        });
    }

    if (current.dialect.supports.HSTORE) {
        it("calls parse and stringify for HSTORE", () => {
            const Type = new type.HSTORE();

            return testSuccess(Type, { test: 42, nested: false });
        });
    }

    if (current.dialect.supports.RANGE) {
        it("calls parse and stringify for RANGE", () => {
            const Type = new type.RANGE(new type.INTEGER());

            return testSuccess(Type, [1, 2]);
        });
    }

    it("calls parse and stringify for DATE", () => {
        const Type = new type.DATE();

        return testSuccess(Type, new Date());
    });

    it("calls parse and stringify for DATEONLY", () => {
        const Type = new type.DATEONLY();

        return testSuccess(Type, adone.datetime(new Date()).format("YYYY-MM-DD"));
    });

    it("calls parse and stringify for TIME", () => {
        const Type = new type.TIME();

        return testSuccess(Type, new Date());
    });

    it("calls parse and stringify for BLOB", () => {
        const Type = new type.BLOB();

        return testSuccess(Type, "foobar");
    });

    it("calls parse and stringify for CHAR", () => {
        const Type = new type.CHAR();

        return testSuccess(Type, "foobar");
    });

    it("calls parse and stringify for STRING", () => {
        const Type = new type.STRING();

        return testSuccess(Type, "foobar");
    });

    it("calls parse and stringify for TEXT", () => {
        const Type = new type.TEXT();

        if (dialect === "mssql") {
            // Text uses nvarchar, same type as string
            testFailure(Type);
        } else {
            return testSuccess(Type, "foobar");
        }
    });

    it("calls parse and stringify for BOOLEAN", () => {
        const Type = new type.BOOLEAN();

        return testSuccess(Type, true);
    });

    it("calls parse and stringify for INTEGER", () => {
        const Type = new type.INTEGER();

        return testSuccess(Type, 1);
    });

    it("calls parse and stringify for DECIMAL", () => {
        const Type = new type.DECIMAL();

        return testSuccess(Type, 1.5);
    });

    it("calls parse and stringify for BIGINT", () => {
        const Type = new type.BIGINT();

        if (dialect === "mssql") {
            // Same type as integer
            testFailure(Type);
        } else {
            return testSuccess(Type, 1);
        }
    });

    it("calls parse and stringify for DOUBLE", () => {
        const Type = new type.DOUBLE();

        return testSuccess(Type, 1.5);
    });

    it("calls parse and stringify for FLOAT", () => {
        const Type = new type.FLOAT();

        if (dialect === "postgres") {
            // Postgres doesn't have float, maps to either decimal or double
            testFailure(Type);
        } else {
            return testSuccess(Type, 1.5);
        }
    });

    it("calls parse and stringify for REAL", () => {
        const Type = new type.REAL();

        return testSuccess(Type, 1.5);
    });

    it("calls parse and stringify for UUID", () => {
        const Type = new type.UUID();

        // there is no dialect.supports.UUID yet
        if (["postgres", "sqlite"].indexOf(dialect) !== -1) {
            return testSuccess(Type, adone.util.uuid.v4());
        }
        // No native uuid type
        testFailure(Type);

    });

    it("calls parse and stringify for ENUM", () => {
        const Type = new type.ENUM("hat", "cat");

        // No dialects actually allow us to identify that we get an enum back..
        testFailure(Type);
    });

    if (current.dialect.supports.GEOMETRY) {
        it("calls parse and stringify for GEOMETRY", () => {
            const Type = new type.GEOMETRY();

            return testSuccess(Type, { type: "Point", coordinates: [125.6, 10.1] });
        });

        it.skip("should parse an empty GEOMETRY field", () => { // TODO: fails with "Invalid GIS data provided to function st_geometryfromtext." on my 5.6.0
            const Type = new type.GEOMETRY();

            // MySQL 5.7 or above doesn't support POINT EMPTY
            if (dialect === "mysql" && adone.semver.gte(current.options.databaseVersion, "5.7.0")) {
                return;
            }

            return new Promise((resolve, reject) => {
                if (/^postgres/.test(dialect)) {
                    current.query("SELECT PostGIS_Lib_Version();")
                        .then((result) => {
                            if (result[0][0] && adone.semver.lte(result[0][0].postgis_lib_version, "2.1.7")) {
                                resolve(true);
                            } else {
                                resolve();
                            }
                        }).catch(reject);
                } else {
                    resolve(true);
                }
            }).then((runTests) => {
                if (current.dialect.supports.GEOMETRY && runTests) {
                    current.refreshTypes();

                    const User = current.define("user", { field: Type }, { timestamps: false });
                    const point = { type: "Point", coordinates: [] };

                    return current.sync({ force: true }).then(() => {
                        return User.create({
                            //insert an empty GEOMETRY type
                            field: point
                        });
                    }).then(() => {
                        //This case throw unhandled exception
                        return User.findAll();
                    }).then((users) => {
                        if (dialect === "mysql") {
                            // MySQL will return NULL, becuase they lack EMPTY geometry data support.
                            expect(users[0].field).to.be.eql(null);
                        } else if (dialect === "postgres" || dialect === "postgres-native") {
                            //Empty Geometry data [0,0] as per https://trac.osgeo.org/postgis/ticket/1996
                            expect(users[0].field).to.be.deep.eql({ type: "Point", coordinates: [0, 0] });
                        } else {
                            expect(users[0].field).to.be.deep.eql(point);
                        }
                    });
                }
            });
        });

        it("should parse null GEOMETRY field", () => {
            const Type = new type.GEOMETRY();

            current.refreshTypes();

            const User = current.define("user", { field: Type }, { timestamps: false });
            const point = null;

            return current.sync({ force: true }).then(() => {
                return User.create({
                // insert a null GEOMETRY type
                    field: point
                });
            }).then(() => {
                //This case throw unhandled exception
                return User.findAll();
            }).then((users) => {
                expect(users[0].field).to.be.eql(null);
            });
        });
    }

    if (dialect === "postgres" || dialect === "sqlite") {
        // postgres actively supports IEEE floating point literals, and sqlite doesn't care what we throw at it
        it("should store and parse IEEE floating point literals (NaN and Infinity)", function () {
            const Model = this.sequelize.define("model", {
                float: type.FLOAT,
                double: type.DOUBLE,
                real: type.REAL
            });

            return Model.sync({ force: true }).then(() => {
                return Model.create({
                    id: 1,
                    float: NaN,
                    double: Infinity,
                    real: -Infinity
                });
            }).then(() => {
                return Model.find({ where: { id: 1 } });
            }).then((user) => {
                expect(user.get("float")).to.be.NaN;
                expect(user.get("double")).to.eq(Infinity);
                expect(user.get("real")).to.eq(-Infinity);
            });
        });
    }

    if (dialect === "postgres" || dialect === "mysql") {
        it("should parse DECIMAL as string", function () {
            const Model = this.sequelize.define("model", {
                decimal: type.DECIMAL,
                decimalPre: new type.DECIMAL(10, 4),
                decimalWithParser: new type.DECIMAL(32, 15),
                decimalWithIntParser: new type.DECIMAL(10, 4),
                decimalWithFloatParser: new type.DECIMAL(10, 8)
            });

            const sampleData = {
                id: 1,
                decimal: 12345678.12345678,
                decimalPre: 123456.1234,
                decimalWithParser: "12345678123456781.123456781234567",
                decimalWithIntParser: 1.234,
                decimalWithFloatParser: 0.12345678
            };

            return Model.sync({ force: true }).then(() => {
                return Model.create(sampleData);
            }).then(() => {
                return Model.findById(1);
            }).then((user) => {
                /**
                 * MYSQL default precision is 10 and scale is 0
                 * Thus test case below will return number without any fraction values
                */
                if (dialect === "mysql") {
                    expect(user.get("decimal")).to.be.eql("12345678");
                } else {
                    expect(user.get("decimal")).to.be.eql("12345678.12345678");
                }

                expect(user.get("decimalPre")).to.be.eql("123456.1234");
                expect(user.get("decimalWithParser")).to.be.eql("12345678123456781.123456781234567");
                expect(user.get("decimalWithIntParser")).to.be.eql("1.2340");
                expect(user.get("decimalWithFloatParser")).to.be.eql("0.12345678");
            });
        });

        it("should parse BIGINT as string", function () {
            const Model = this.sequelize.define("model", {
                jewelPurity: type.BIGINT
            });

            const sampleData = {
                id: 1,
                jewelPurity: "9223372036854775807"
            };

            return Model.sync({ force: true }).then(() => {
                return Model.create(sampleData);
            }).then(() => {
                return Model.findById(1);
            }).then((user) => {
                expect(user.get("jewelPurity")).to.be.eql(sampleData.jewelPurity);
                expect(user.get("jewelPurity")).to.be.string;
            });
        });
    }

    if (dialect === "postgres") {
        it("should return Int4 range properly #5747", async function () {
            const Model = this.sequelize.define("M", {
                interval: {
                    type: new type.RANGE(type.INTEGER),
                    allowNull: false,
                    unique: true
                }
            });

            await Model.sync({ force: true });
            await Model.create({ interval: [1, 4] });
            const [m] = await Model.findAll();
            expect(m.interval[0]).to.be.eql(1);
            expect(m.interval[1]).to.be.eql(4);
        });
    }

    it("should allow spaces in ENUM", async function () {
        const Model = this.sequelize.define("user", {
            name: type.STRING,
            type: new type.ENUM(["action", "mecha", "canon", "class s"])
        });

        await Model.sync({ force: true });
        const record = await Model.create({ name: "sakura", type: "class s" });
        expect(record.type).to.be.eql("class s");
    });

    it("should return YYYY-MM-DD format string for DATEONLY", function () {
        const Model = this.sequelize.define("user", {
            stamp: type.DATEONLY
        });
        const testDate = adone.datetime().format("YYYY-MM-DD");
        const newDate = new Date();

        return Model.sync({ force: true })
            .then(() => Model.create({ stamp: testDate }))
            .then((record) => {
                expect(typeof record.stamp).to.be.eql("string");
                expect(record.stamp).to.be.eql(testDate);

                return Model.findById(record.id);
            }).then((record) => {
                expect(typeof record.stamp).to.be.eql("string");
                expect(record.stamp).to.be.eql(testDate);

                return record.update({
                    stamp: testDate
                });
            }).then((record) => {
                return record.reload();
            }).then((record) => {
                expect(typeof record.stamp).to.be.eql("string");
                expect(record.stamp).to.be.eql(testDate);

                return record.update({
                    stamp: newDate
                });
            }).then((record) => {
                return record.reload();
            }).then((record) => {
                expect(typeof record.stamp).to.be.eql("string");
                newDate.setUTCHours(0);
                newDate.setUTCMinutes(0);
                newDate.setUTCSeconds(0);
                newDate.setUTCMilliseconds(0);
                expect(new Date(record.stamp)).to.be.deep.equal(newDate);
            });
    });

    it("should return set DATEONLY field to NULL correctly", function () {
        const Model = this.sequelize.define("user", {
            stamp: type.DATEONLY
        });
        const testDate = adone.datetime().format("YYYY-MM-DD");

        return Model.sync({ force: true })
            .then(() => Model.create({ stamp: testDate }))
            .then((record) => {
                expect(typeof record.stamp).to.be.eql("string");
                expect(record.stamp).to.be.eql(testDate);

                return Model.findById(record.id);
            }).then((record) => {
                expect(typeof record.stamp).to.be.eql("string");
                expect(record.stamp).to.be.eql(testDate);

                return record.update({
                    stamp: null
                });
            }).then((record) => {
                return record.reload();
            }).then((record) => {
                expect(record.stamp).to.be.eql(null);
            });
    });

    it("should be able to cast buffer as boolean", async function () {
        const ByteModel = this.sequelize.define("Model", {
            byteToBool: type.BLOB
        }, {
            timestamps: false
        });

        const BoolModel = this.sequelize.define("Model", {
            byteToBool: type.BOOLEAN
        }, {
            timestamps: false
        });

        await ByteModel.sync({
            force: true
        });
        const byte = await ByteModel.create({
            byteToBool: Buffer.from([true])
        });

        expect(byte.byteToBool).to.be.ok;

        const bool = await BoolModel.findById(byte.id);
        expect(bool.byteToBool).to.be.true;
    });
});
