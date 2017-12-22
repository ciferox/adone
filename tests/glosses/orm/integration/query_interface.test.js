import Support from "./support";

const { orm } = adone;
const { type } = orm;

const { vendor: { lodash: _ } } = adone;
const dialect = Support.getTestDialect();
const current = Support.sequelize;
let count = 0;

const log = function () {
    // sqlite fires a lot more querys than the other dbs. this is just a simple hack, since i'm lazy
    if (dialect !== "sqlite" || count === 0) {
        count++;
    }
};

describe(Support.getTestDialectTeaser("QueryInterface"), () => {
    beforeEach(function () {
        this.sequelize.options.quoteIdenifiers = true;
        this.queryInterface = this.sequelize.getQueryInterface();
    });

    afterEach(function () {
        return this.sequelize.dropAllSchemas();
    });

    describe("renameTable", () => {
        it("should rename table", function () {
            return this.queryInterface
                .createTable("myTestTable", {
                    name: type.STRING
                })
                .then(() => this.queryInterface.renameTable("myTestTable", "myTestTableNew"))
                .then(() => this.queryInterface.showAllTables())
                .then((tableNames) => {
                    if (dialect === "mssql") {
                        tableNames = _.map(tableNames, "tableName");
                    }
                    expect(tableNames).to.contain("myTestTableNew");
                    expect(tableNames).to.not.contain("myTestTable");
                });
        });
    });

    describe("dropAllTables", () => {
        it("should drop all tables", function () {
            const filterMSSQLDefault = (tableNames) => tableNames.filter((t) => t.tableName !== "spt_values");
            const self = this;
            return this.queryInterface.dropAllTables().then(() => {
                return self.queryInterface.showAllTables().then((tableNames) => {
                    // MSSQL include spt_values table which is system defined, hence cant be dropped
                    tableNames = filterMSSQLDefault(tableNames);
                    expect(tableNames).to.be.empty();
                    return self.queryInterface.createTable("table", { name: type.STRING }).then(() => {
                        return self.queryInterface.showAllTables().then((tableNames) => {
                            tableNames = filterMSSQLDefault(tableNames);
                            expect(tableNames).to.have.length(1);
                            return self.queryInterface.dropAllTables().then(() => {
                                return self.queryInterface.showAllTables().then((tableNames) => {
                                    // MSSQL include spt_values table which is system defined, hence cant be dropped
                                    tableNames = filterMSSQLDefault(tableNames);
                                    expect(tableNames).to.be.empty();
                                });
                            });
                        });
                    });
                });
            });
        });

        it("should be able to skip given tables", function () {
            const self = this;
            return self.queryInterface.createTable("skipme", {
                name: type.STRING
            }).then(() => {
                return self.queryInterface.dropAllTables({ skip: ["skipme"] }).then(() => {
                    return self.queryInterface.showAllTables().then((tableNames) => {
                        if (dialect === "mssql" /* current.dialect.supports.schemas */) {
                            tableNames = _.map(tableNames, "tableName");
                        }
                        expect(tableNames).to.contain("skipme");
                    });
                });
            });
        });
    });

    describe("indexes", () => {
        beforeEach(function () {
            const self = this;
            return this.queryInterface.dropTable("Group").then(() => {
                return self.queryInterface.createTable("Group", {
                    username: type.STRING,
                    isAdmin: type.BOOLEAN,
                    from: type.STRING
                });
            });
        });

        it("adds, reads and removes an index to the table", function () {
            const self = this;
            return this.queryInterface.addIndex("Group", ["username", "isAdmin"]).then(() => {
                return self.queryInterface.showIndex("Group").then((indexes) => {
                    let indexColumns = _.uniq(indexes.map((index) => {
                        return index.name;
                    }));
                    expect(indexColumns).to.include("group_username_is_admin");
                    return self.queryInterface.removeIndex("Group", ["username", "isAdmin"]).then(() => {
                        return self.queryInterface.showIndex("Group").then((indexes) => {
                            indexColumns = _.uniq(indexes.map((index) => {
                                return index.name;
                            }));
                            expect(indexColumns).to.be.empty();
                        });
                    });
                });
            });
        });

        it("works with schemas", function () {
            const self = this;
            return self.sequelize.createSchema("schema").then(() => {
                return self.queryInterface.createTable("table", {
                    name: {
                        type: type.STRING
                    },
                    isAdmin: {
                        type: type.STRING
                    }
                }, {
                    schema: "schema"
                });
            }).then(() => {
                return self.queryInterface.addIndex({
                    schema: "schema",
                    tableName: "table"
                }, ["name", "isAdmin"], null, "schema_table").then(() => {
                    return self.queryInterface.showIndex({
                        schema: "schema",
                        tableName: "table"
                    }).then((indexes) => {
                        expect(indexes.length).to.eq(1);
                        const index = indexes[0];
                        expect(index.name).to.eq("table_name_is_admin");
                    });
                });
            });
        });

        it("does not fail on reserved keywords", function () {
            return this.queryInterface.addIndex("Group", ["from"]);
        });
    });

    describe("describeTable", () => {
        it("reads the metadata of the table", function () {
            const self = this;
            const Users = self.sequelize.define("_Users", {
                username: type.STRING,
                city: {
                    type: type.STRING,
                    defaultValue: null
                },
                isAdmin: type.BOOLEAN,
                enumVals: new type.ENUM("hello", "world")
            }, { freezeTableName: true });

            return Users.sync({ force: true }).then(() => {
                return self.queryInterface.describeTable("_Users").then((metadata) => {
                    const id = metadata.id;
                    const username = metadata.username;
                    const city = metadata.city;
                    const isAdmin = metadata.isAdmin;
                    const enumVals = metadata.enumVals;

                    expect(id.primaryKey).to.be.ok();

                    let assertVal = "VARCHAR(255)";
                    switch (dialect) {
                        case "postgres":
                            assertVal = "CHARACTER VARYING(255)";
                            break;
                        case "mssql":
                            assertVal = "NVARCHAR";
                            break;
                    }
                    expect(username.type).to.equal(assertVal);
                    expect(username.allowNull).to.be.true();

                    switch (dialect) {
                        case "sqlite":
                            expect(username.defaultValue).to.be.undefined();
                            break;
                        default:
                            expect(username.defaultValue).to.be.null();
                    }

                    switch (dialect) {
                        case "sqlite":
                            expect(city.defaultValue).to.be.null();
                            break;
                    }

                    assertVal = "TINYINT(1)";
                    switch (dialect) {
                        case "postgres":
                            assertVal = "BOOLEAN";
                            break;
                        case "mssql":
                            assertVal = "BIT";
                            break;
                    }
                    expect(isAdmin.type).to.equal(assertVal);
                    expect(isAdmin.allowNull).to.be.true();
                    switch (dialect) {
                        case "sqlite":
                            expect(isAdmin.defaultValue).to.be.undefined();
                            break;
                        default:
                            expect(isAdmin.defaultValue).to.be.null();
                    }

                    if (dialect === "postgres" || dialect === "postgres-native") {
                        expect(enumVals.special).to.be.instanceof(Array);
                        expect(enumVals.special).to.have.length(2);
                    } else if (dialect === "mysql") {
                        expect(enumVals.type).to.eql("ENUM('hello','world')");
                    }
                });
            });
        });

        it("should correctly determine the primary key columns", function () {
            const self = this;
            const Country = self.sequelize.define("_Country", {
                code: { type: type.STRING, primaryKey: true },
                name: { type: type.STRING, allowNull: false }
            }, { freezeTableName: true });
            const Alumni = self.sequelize.define("_Alumni", {
                year: { type: type.INTEGER, primaryKey: true },
                num: { type: type.INTEGER, primaryKey: true },
                username: { type: type.STRING, allowNull: false, unique: true },
                dob: { type: type.DATEONLY, allowNull: false },
                dod: { type: type.DATEONLY, allowNull: true },
                city: { type: type.STRING, allowNull: false },
                ctrycod: { type: type.STRING, allowNull: false,
                    references: { model: Country, key: "code" } }
            }, { freezeTableName: true });

            return Country.sync({ force: true }).then(() => {
                return self.queryInterface.describeTable("_Country").then((metacountry) => {
                    expect(metacountry.code.primaryKey).to.eql(true);
                    expect(metacountry.name.primaryKey).to.eql(false);

                    return Alumni.sync({ force: true }).then(() => {
                        return self.queryInterface.describeTable("_Alumni").then((metalumni) => {
                            expect(metalumni.year.primaryKey).to.eql(true);
                            expect(metalumni.num.primaryKey).to.eql(true);
                            expect(metalumni.username.primaryKey).to.eql(false);
                            expect(metalumni.dob.primaryKey).to.eql(false);
                            expect(metalumni.dod.primaryKey).to.eql(false);
                            expect(metalumni.ctrycod.primaryKey).to.eql(false);
                            expect(metalumni.city.primaryKey).to.eql(false);
                        });
                    });
                });
            });
        });
    });

    // FIXME: These tests should make assertions against the created table using describeTable
    describe("createTable", () => {
        it("should create a auto increment primary key", async function () {
            await this.queryInterface.createTable("TableWithPK", {
                table_id: {
                    type: type.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                }
            });
            const results = await this.queryInterface.insert(null, "TableWithPK", {}, { raw: true, returning: true, plain: true });
            const response = _.head(results);
            expect(response.table_id || typeof response !== "object" && response).to.be.ok();
        });

        it("should work with enums (1)", function () {
            return this.queryInterface.createTable("SomeTable", {
                someEnum: new type.ENUM("value1", "value2", "value3")
            });
        });

        it("should work with enums (2)", function () {
            return this.queryInterface.createTable("SomeTable", {
                someEnum: {
                    type: type.ENUM,
                    values: ["value1", "value2", "value3"]
                }
            });
        });

        it("should work with enums (3)", function () {
            return this.queryInterface.createTable("SomeTable", {
                someEnum: {
                    type: type.ENUM,
                    values: ["value1", "value2", "value3"],
                    field: "otherName"
                }
            });
        });

        it("should work with enums (4)", async function () {
            await this.queryInterface.createSchema("archive");
            await this.queryInterface.createTable("SomeTale", {
                someEnum: {
                    type: type.ENUM,
                    values: ["value1", "value2", "value3"],
                    field: "otherName"
                }
            }, { schema: "archive" });
        });

        it("should work with schemas", function () {
            const self = this;
            return self.sequelize.createSchema("hero").then(() => {
                return self.queryInterface.createTable("User", {
                    name: {
                        type: type.STRING
                    }
                }, {
                    schema: "hero"
                });
            });
        });
    });

    describe("renameColumn", () => {
        it("rename a simple column", async function () {
            const self = this;
            const Users = self.sequelize.define("_Users", {
                username: type.STRING
            }, { freezeTableName: true });

            await Users.sync({ force: true });
            await self.queryInterface.renameColumn("_Users", "username", "pseudo");
            const table = await this.queryInterface.describeTable("_Users");
            expect(table).to.have.property("pseudo");
            expect(table).to.not.have.property("username");
        });

        it("works with schemas", async function () {
            const self = this;
            await self.sequelize.createSchema("archive");
            const Users = self.sequelize.define("User", {
                username: type.STRING
            }, {
                tableName: "Users",
                schema: "archive"
            });
            await Users.sync({ force: true });
            await self.queryInterface.renameColumn({
                schema: "archive",
                tableName: "Users"
            }, "username", "pseudo");
            const table = await this.queryInterface.describeTable({
                schema: "archive",
                tableName: "Users"
            });
            expect(table).to.have.property("pseudo");
            expect(table).to.not.have.property("username");
        });

        it("rename a column non-null without default value", async function () {
            const self = this;
            const Users = self.sequelize.define("_Users", {
                username: {
                    type: type.STRING,
                    allowNull: false
                }
            }, { freezeTableName: true });

            await Users.sync({ force: true });
            await self.queryInterface.renameColumn("_Users", "username", "pseudo");
            const table = await this.queryInterface.describeTable("_Users");
            expect(table).to.have.property("pseudo");
            expect(table).to.not.have.property("username");
        });

        it("rename a boolean column non-null without default value", async function () {
            const self = this;
            const Users = self.sequelize.define("_Users", {
                active: {
                    type: type.BOOLEAN,
                    allowNull: false,
                    defaultValue: false
                }
            }, { freezeTableName: true });

            await Users.sync({ force: true });
            await self.queryInterface.renameColumn("_Users", "active", "enabled");
            const table = await this.queryInterface.describeTable("_Users");
            expect(table).to.have.property("enabled");
            expect(table).to.not.have.property("active");
        });

        it("renames a column primary key autoIncrement column", async function () {
            const self = this;
            const Fruits = self.sequelize.define("Fruit", {
                fruitId: {
                    type: type.INTEGER,
                    allowNull: false,
                    primaryKey: true,
                    autoIncrement: true
                }
            }, { freezeTableName: true });

            await Fruits.sync({ force: true });
            await self.queryInterface.renameColumn("Fruit", "fruitId", "fruit_id");
            const table = await this.queryInterface.describeTable("Fruit");
            expect(table).to.have.property("fruit_id");
            expect(table).to.not.have.property("fruitId");
        });

        it("shows a reasonable error message when column is missing", async function () {
            const self = this;
            const Users = self.sequelize.define("_Users", {
                username: type.STRING
            }, { freezeTableName: true });

            await Users.sync({ force: true });

            await assert.throws(async () => {
                await self.queryInterface.renameColumn("_Users", "email", "pseudo");
            }, "Table _Users doesn't have the column email");
        });
    });

    describe("changeColumn", () => {
        it("should support schemas", async function () {
            await this.sequelize.createSchema("archive");
            await this.queryInterface.createTable({
                tableName: "users",
                schema: "archive"
            }, {
                id: {
                    type: type.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                currency: type.INTEGER
            });
            await this.queryInterface.changeColumn({
                tableName: "users",
                schema: "archive"
            }, "currency", {
                type: type.FLOAT
            });
            const table = await this.queryInterface.describeTable({
                tableName: "users",
                schema: "archive"
            });
            if (dialect === "postgres" || dialect === "postgres-native") {
                expect(table.currency.type).to.equal("DOUBLE PRECISION");
            } else {
                expect(table.currency.type).to.equal("FLOAT");
            }
        });

        it("should change columns", async function () {
            await this.queryInterface.createTable({
                tableName: "users"
            }, {
                id: {
                    type: type.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                currency: type.INTEGER
            });
            await this.queryInterface.changeColumn("users", "currency", {
                type: type.FLOAT,
                allowNull: true
            });
            const table = await this.queryInterface.describeTable({
                tableName: "users"
            });
            if (dialect === "postgres" || dialect === "postgres-native") {
                expect(table.currency.type).to.equal("DOUBLE PRECISION");
            } else {
                expect(table.currency.type).to.equal("FLOAT");
            }
        });

        // MSSQL doesn't support using a modified column in a check constraint.
        // https://docs.microsoft.com/en-us/sql/t-sql/statements/alter-table-transact-sql
        if (dialect !== "mssql") {
            it("should work with enums", async function () {
                await this.queryInterface.createTable({
                    tableName: "users"
                }, {
                    firstName: type.STRING
                });
                await this.queryInterface.changeColumn("users", "firstName", {
                    type: new type.ENUM(["value1", "value2", "value3"])
                });
            });

            it("should work with enums with schemas", async function () {
                await this.sequelize.createSchema("archive");
                await this.queryInterface.createTable({
                    tableName: "users",
                    schema: "archive"
                }, {
                    firstName: type.STRING
                });
                await this.queryInterface.changeColumn({
                    tableName: "users",
                    schema: "archive"
                }, "firstName", {
                    type: new type.ENUM(["value1", "value2", "value3"])
                });
            });
        }
    });

    //SQlite navitely doesnt support ALTER Foreign key
    if (dialect !== "sqlite") {
        describe("should support foreign keys", () => {
            beforeEach(async function () {
                await this.queryInterface.createTable("users", {
                    id: {
                        type: type.INTEGER,
                        primaryKey: true,
                        autoIncrement: true
                    },
                    level_id: {
                        type: type.INTEGER,
                        allowNull: false
                    }
                });
                await this.queryInterface.createTable("level", {
                    id: {
                        type: type.INTEGER,
                        primaryKey: true,
                        autoIncrement: true
                    }
                });
            });

            it("able to change column to foreign key", function () {
                return this.queryInterface.changeColumn("users", "level_id", {
                    type: type.INTEGER,
                    references: {
                        model: "level",
                        key: "id"
                    },
                    onUpdate: "cascade",
                    onDelete: "cascade"
                }, { logging: log }).then(() => {
                    expect(count).to.be.equal(1);
                    count = 0;
                });
            });

        });
    }

    describe("addColumn", () => {
        beforeEach(async function () {
            await this.sequelize.createSchema("archive");
            await this.queryInterface.createTable("users", {
                id: {
                    type: type.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                }
            });
        });

        it("should be able to add a foreign key reference", async function () {
            await this.queryInterface.createTable("level", {
                id: {
                    type: type.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                }
            });
            await this.queryInterface.addColumn("users", "level_id", {
                type: type.INTEGER,
                references: {
                    model: "level",
                    key: "id"
                },
                onUpdate: "cascade",
                onDelete: "set null"
            });
            const table = await this.queryInterface.describeTable("users");
            expect(table).to.have.property("level_id");
        });

        it("should work with schemas", async function () {
            await this.queryInterface.createTable({
                tableName: "users",
                schema: "archive"
            }, {
                id: {
                    type: type.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                }
            });
            await this.queryInterface.addColumn({
                tableName: "users",
                schema: "archive"
            }, "level_id", {
                type: type.INTEGER
            });
            const table = await this.queryInterface.describeTable({
                tableName: "users",
                schema: "archive"
            });
            expect(table).to.have.property("level_id");
        });

        it("should work with enums (1)", function () {
            return this.queryInterface.addColumn("users", "someEnum", new type.ENUM("value1", "value2", "value3"));
        });

        it("should work with enums (2)", function () {
            return this.queryInterface.addColumn("users", "someOtherEnum", {
                type: type.ENUM,
                values: ["value1", "value2", "value3"]
            });
        });
    });

    describe("removeColumn", () => {
        describe("(without a schema)", () => {
            beforeEach(function () {
                return this.queryInterface.createTable("users", {
                    id: {
                        type: type.INTEGER,
                        primaryKey: true,
                        autoIncrement: true
                    },
                    firstName: {
                        type: type.STRING,
                        defaultValue: "Someone"
                    },
                    lastName: {
                        type: type.STRING
                    },
                    manager: {
                        type: type.INTEGER,
                        references: {
                            model: "users",
                            key: "id"
                        }
                    },
                    email: {
                        type: type.STRING,
                        unique: true
                    }
                });
            });

            it("should be able to remove a column with a default value", function () {
                return this.queryInterface.removeColumn("users", "firstName").then(() => {
                    return this.queryInterface.describeTable("users");
                }).then((table) => {
                    expect(table).to.not.have.property("firstName");
                });
            });

            it("should be able to remove a column without default value", function () {
                return this.queryInterface.removeColumn("users", "lastName").then(() => {
                    return this.queryInterface.describeTable("users");
                }).then((table) => {
                    expect(table).to.not.have.property("lastName");
                });
            });

            it("should be able to remove a column with a foreign key constraint", function () {
                return this.queryInterface.removeColumn("users", "manager").then(() => {
                    return this.queryInterface.describeTable("users");
                }).then((table) => {
                    expect(table).to.not.have.property("manager");
                });
            });

            it("should be able to remove a column with primaryKey", function () {
                return this.queryInterface.removeColumn("users", "manager").then(() => {
                    return this.queryInterface.describeTable("users");
                }).then((table) => {
                    expect(table).to.not.have.property("manager");
                    return this.queryInterface.removeColumn("users", "id");
                }).then(() => {
                    return this.queryInterface.describeTable("users");
                }).then((table) => {
                    expect(table).to.not.have.property("id");
                });
            });

            // From MSSQL documentation on ALTER COLUMN:
            //    The modified column cannot be any one of the following:
            //      - Used in a CHECK or UNIQUE constraint.
            // https://docs.microsoft.com/en-us/sql/t-sql/statements/alter-table-transact-sql#arguments
            if (dialect !== "mssql") {
                it("should be able to remove a column with unique contraint", function () {
                    return this.queryInterface.removeColumn("users", "email").then(() => {
                        return this.queryInterface.describeTable("users");
                    }).then((table) => {
                        expect(table).to.not.have.property("email");
                    });
                });
            }
        });

        describe("(with a schema)", () => {
            beforeEach(async function () {
                await this.sequelize.createSchema("archive");
                await this.queryInterface.createTable({
                    tableName: "users",
                    schema: "archive"
                }, {
                    id: {
                        type: type.INTEGER,
                        primaryKey: true,
                        autoIncrement: true
                    },
                    firstName: {
                        type: type.STRING,
                        defaultValue: "Someone"
                    },
                    lastName: {
                        type: type.STRING
                    },
                    email: {
                        type: type.STRING,
                        unique: true
                    }
                });
            });

            it("should be able to remove a column with a default value", function () {
                return this.queryInterface.removeColumn({
                    tableName: "users",
                    schema: "archive"
                }, "firstName").then(() => {
                    return this.queryInterface.describeTable({
                        tableName: "users",
                        schema: "archive"
                    });
                }).then((table) => {
                    expect(table).to.not.have.property("firstName");
                });
            });

            it("should be able to remove a column without default value", function () {
                return this.queryInterface.removeColumn({
                    tableName: "users",
                    schema: "archive"
                }, "lastName").then(() => {
                    return this.queryInterface.describeTable({
                        tableName: "users",
                        schema: "archive"
                    });
                }).then((table) => {
                    expect(table).to.not.have.property("lastName");
                });
            });

            it("should be able to remove a column with primaryKey", function () {
                return this.queryInterface.removeColumn({
                    tableName: "users",
                    schema: "archive"
                }, "id").then(() => {
                    return this.queryInterface.describeTable({
                        tableName: "users",
                        schema: "archive"
                    });
                }).then((table) => {
                    expect(table).to.not.have.property("id");
                });
            });

            // From MSSQL documentation on ALTER COLUMN:
            //    The modified column cannot be any one of the following:
            //      - Used in a CHECK or UNIQUE constraint.
            // https://docs.microsoft.com/en-us/sql/t-sql/statements/alter-table-transact-sql#arguments
            if (dialect !== "mssql") {
                it("should be able to remove a column with unique contraint", function () {
                    return this.queryInterface.removeColumn({
                        tableName: "users",
                        schema: "archive"
                    }, "email").then(() => {
                        return this.queryInterface.describeTable({
                            tableName: "users",
                            schema: "archive"
                        });
                    }).then((table) => {
                        expect(table).to.not.have.property("email");
                    });
                });
            }
        });
    });

    describe("describeForeignKeys", () => {
        beforeEach(async function () {
            await this.queryInterface.createTable("users", {
                id: {
                    type: type.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                }
            });
            await this.queryInterface.createTable("hosts", {
                id: {
                    type: type.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                admin: {
                    type: type.INTEGER,
                    references: {
                        model: "users",
                        key: "id"
                    }
                },
                operator: {
                    type: type.INTEGER,
                    references: {
                        model: "users",
                        key: "id"
                    },
                    onUpdate: "cascade"
                },
                owner: {
                    type: type.INTEGER,
                    references: {
                        model: "users",
                        key: "id"
                    },
                    onUpdate: "cascade",
                    onDelete: "set null"
                }
            });
        });

        it("should get a list of foreign keys for the table", async function () {
            const sql = this.queryInterface.QueryGenerator.getForeignKeysQuery("hosts", this.sequelize.config.database);
            const self = this;
            const fks = await this.sequelize.query(sql, { type: this.sequelize.queryType.FOREIGNKEYS });
            expect(fks).to.have.length(3);
            const keys = Object.keys(fks[0]);
            const keys2 = Object.keys(fks[1]);
            const keys3 = Object.keys(fks[2]);

            if (dialect === "postgres" || dialect === "postgres-native") {
                expect(keys).to.have.length(6);
                expect(keys2).to.have.length(7);
                expect(keys3).to.have.length(7);
            } else if (dialect === "sqlite") {
                expect(keys).to.have.length(8);
            } else if (dialect === "mysql" || dialect === "mssql") {
                expect(keys).to.have.length(1);
            } else {
                console.log(`This test doesn't support ${dialect}`);
            }
            if (dialect === "mysql") {
                const [fk] = await self.sequelize.query(
                    self.queryInterface.QueryGenerator.getForeignKeyQuery("hosts", "admin"),
                    {}
                );
                expect(fks[0]).to.deep.eql(fk[0]);
            }
        });
    });

    describe("constraints", () => {
        beforeEach(function () {
            this.User = this.sequelize.define("users", {
                username: type.STRING,
                email: type.STRING,
                roles: type.STRING
            });

            this.Post = this.sequelize.define("posts", {
                username: type.STRING
            });
            return this.sequelize.sync({ force: true });
        });


        describe("unique", () => {
            it("should add, read & remove unique constraint", function () {
                return this.queryInterface.addConstraint("users", ["email"], {
                    type: "unique"
                })
                    .then(() => this.queryInterface.showConstraint("users"))
                    .then((constraints) => {
                        constraints = constraints.map((constraint) => constraint.constraintName);
                        expect(constraints).to.include("users_email_uk");
                        return this.queryInterface.removeConstraint("users", "users_email_uk");
                    })
                    .then(() => this.queryInterface.showConstraint("users"))
                    .then((constraints) => {
                        constraints = constraints.map((constraint) => constraint.constraintName);
                        expect(constraints).to.not.include("users_email_uk");
                    });
            });
        });

        if (current.dialect.supports.constraints.check) {
            describe("check", () => {
                it("should add, read & remove check constraint", function () {
                    return this.queryInterface.addConstraint("users", ["roles"], {
                        type: "check",
                        where: {
                            roles: ["user", "admin", "guest", "moderator"]
                        },
                        name: "check_user_roles"
                    })
                        .then(() => this.queryInterface.showConstraint("users"))
                        .then((constraints) => {
                            constraints = constraints.map((constraint) => constraint.constraintName);
                            expect(constraints).to.include("check_user_roles");
                            return this.queryInterface.removeConstraint("users", "check_user_roles");
                        })
                        .then(() => this.queryInterface.showConstraint("users"))
                        .then((constraints) => {
                            constraints = constraints.map((constraint) => constraint.constraintName);
                            expect(constraints).to.not.include("check_user_roles");
                        });
                });
            });
        }

        if (current.dialect.supports.constraints.default) {
            describe("default", () => {
                it("should add, read & remove default constraint", function () {
                    return this.queryInterface.addConstraint("users", ["roles"], {
                        type: "default",
                        defaultValue: "guest"
                    })
                        .then(() => this.queryInterface.showConstraint("users"))
                        .then((constraints) => {
                            constraints = constraints.map((constraint) => constraint.constraintName);
                            expect(constraints).to.include("users_roles_df");
                            return this.queryInterface.removeConstraint("users", "users_roles_df");
                        })
                        .then(() => this.queryInterface.showConstraint("users"))
                        .then((constraints) => {
                            constraints = constraints.map((constraint) => constraint.constraintName);
                            expect(constraints).to.not.include("users_roles_df");
                        });
                });
            });
        }


        describe("primary key", () => {
            it("should add, read & remove primary key constraint", function () {
                return this.queryInterface.removeColumn("users", "id")
                    .then(() => {
                        return this.queryInterface.changeColumn("users", "username", {
                            type: type.STRING,
                            allowNull: false
                        });
                    })
                    .then(() => {
                        return this.queryInterface.addConstraint("users", ["username"], {
                            type: "PRIMARY KEY"
                        });
                    })
                    .then(() => this.queryInterface.showConstraint("users"))
                    .then((constraints) => {
                        constraints = constraints.map((constraint) => constraint.constraintName);
                        //The name of primaryKey constraint is always PRIMARY in case of mysql
                        if (dialect === "mysql") {
                            expect(constraints).to.include("PRIMARY");
                            return this.queryInterface.removeConstraint("users", "PRIMARY");
                        }
                        expect(constraints).to.include("users_username_pk");
                        return this.queryInterface.removeConstraint("users", "users_username_pk");

                    })
                    .then(() => this.queryInterface.showConstraint("users"))
                    .then((constraints) => {
                        constraints = constraints.map((constraint) => constraint.constraintName);
                        expect(constraints).to.not.include("users_username_pk");
                    });
            });
        });

        describe("foreign key", () => {
            it("should add, read & remove foreign key constraint", function () {
                return this.queryInterface.removeColumn("users", "id")
                    .then(() => {
                        return this.queryInterface.changeColumn("users", "username", {
                            type: type.STRING,
                            allowNull: false
                        });
                    })
                    .then(() => {
                        return this.queryInterface.addConstraint("users", {
                            type: "PRIMARY KEY",
                            fields: ["username"]
                        });
                    })
                    .then(() => {
                        return this.queryInterface.addConstraint("posts", ["username"], {
                            references: {
                                table: "users",
                                field: "username"
                            },
                            onDelete: "cascade",
                            onUpdate: "cascade",
                            type: "foreign key"
                        });
                    })
                    .then(() => this.queryInterface.showConstraint("posts"))
                    .then((constraints) => {
                        constraints = constraints.map((constraint) => constraint.constraintName);
                        expect(constraints).to.include("posts_username_users_fk");
                        return this.queryInterface.removeConstraint("posts", "posts_username_users_fk");
                    })
                    .then(() => this.queryInterface.showConstraint("posts"))
                    .then((constraints) => {
                        constraints = constraints.map((constraint) => constraint.constraintName);
                        expect(constraints).to.not.include("posts_username_users_fk");
                    });
            });
        });

        describe("error handling", () => {
            it("should throw non existent constraints as UnknownConstraintError", async function () {
                const err = await assert.throws(async () => {
                    await this.queryInterface.removeConstraint("users", "unknown__contraint__name", {
                        type: "unique"
                    });
                });
                expect(err).to.be.instanceof(orm.x.UnknownConstraintError);
            });
        });
    });
});
