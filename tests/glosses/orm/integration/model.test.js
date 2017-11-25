import Support from "./support";

const { orm } = adone;
const { type } = orm;

const { vendor: { lodash: _ } } = adone;
const dialect = Support.getTestDialect();
const current = Support.sequelize;

describe(Support.getTestDialectTeaser("Model"), () => {
    before(function () {
        this.clock = fakeClock.install();
    });

    after(function () {
        this.clock.uninstall();
    });

    beforeEach(function () {
        this.User = this.sequelize.define("User", {
            username: type.STRING,
            secretValue: type.STRING,
            data: type.STRING,
            intVal: type.INTEGER,
            theDate: type.DATE,
            aBool: type.BOOLEAN
        });

        return this.User.sync({ force: true });
    });

    describe("constructor", () => {
        it("uses the passed dao name as tablename if freezeTableName", function () {
            const User = this.sequelize.define("FrozenUser", {}, { freezeTableName: true });
            expect(User.tableName).to.equal("FrozenUser");
        });

        it("uses the pluralized dao name as tablename unless freezeTableName", function () {
            const User = this.sequelize.define("SuperUser", {}, { freezeTableName: false });
            expect(User.tableName).to.equal("SuperUsers");
        });

        it("uses checks to make sure dao factory isnt leaking on multiple define", function () {
            this.sequelize.define("SuperUser", {}, { freezeTableName: false });
            const factorySize = this.sequelize.modelManager.all.length;

            this.sequelize.define("SuperUser", {}, { freezeTableName: false });
            const factorySize2 = this.sequelize.modelManager.all.length;

            expect(factorySize).to.equal(factorySize2);
        });

        it("allows us us to predefine the ID column with our own specs", async function () {
            const User = this.sequelize.define("UserCol", {
                id: {
                    type: type.STRING,
                    defaultValue: "User",
                    primaryKey: true
                }
            });

            await User.sync({ force: true });
            expect(await User.create({ id: "My own ID!" })).to.have.property("id", "My own ID!");
        });

        it("throws an error if 2 autoIncrements are passed", function () {
            const self = this;
            expect(() => {
                self.sequelize.define("UserWithTwoAutoIncrements", {
                    userid: { type: type.INTEGER, primaryKey: true, autoIncrement: true },
                    userscore: { type: type.INTEGER, primaryKey: true, autoIncrement: true }
                });
            }).to.throw(Error, "Invalid Instance definition. Only one autoincrement field allowed.");
        });

        it("throws an error if a custom model-wide validation is not a function", function () {
            const self = this;
            expect(() => {
                self.sequelize.define("Foo", {
                    field: type.INTEGER
                }, {
                    validate: {
                        notFunction: 33
                    }
                });
            }).to.throw(Error, "Members of the validate option must be functions. Model: Foo, error with validate member notFunction");
        });

        it("throws an error if a custom model-wide validation has the same name as a field", function () {
            const self = this;
            expect(() => {
                self.sequelize.define("Foo", {
                    field: type.INTEGER
                }, {
                    validate: {
                        field() { }
                    }
                });
            }).to.throw(Error, "A model validator function must not have the same name as a field. Model: Foo, field/validation name: field");
        });

        it("should allow me to set a default value for createdAt and updatedAt", function () {
            const UserTable = this.sequelize.define("UserCol", {
                aNumber: type.INTEGER,
                createdAt: {
                    type: type.DATE,
                    defaultValue: adone.datetime("2012-01-01").toDate()
                },
                updatedAt: {
                    type: type.DATE,
                    defaultValue: adone.datetime("2012-01-02").toDate()
                }
            }, { timestamps: true });

            return UserTable.sync({ force: true }).then(() => {
                return UserTable.create({ aNumber: 5 }).then((user) => {
                    return UserTable.bulkCreate([
                        { aNumber: 10 },
                        { aNumber: 12 }
                    ]).then(() => {
                        return UserTable.findAll({ where: { aNumber: { gte: 10 } } }).then((users) => {
                            expect(adone.datetime(user.createdAt).format("YYYY-MM-DD")).to.equal("2012-01-01");
                            expect(adone.datetime(user.updatedAt).format("YYYY-MM-DD")).to.equal("2012-01-02");
                            users.forEach((u) => {
                                expect(adone.datetime(u.createdAt).format("YYYY-MM-DD")).to.equal("2012-01-01");
                                expect(adone.datetime(u.updatedAt).format("YYYY-MM-DD")).to.equal("2012-01-02");
                            });
                        });
                    });
                });
            });
        });

        it("should allow me to set a function as default value", function () {
            const defaultFunction = stub().returns(5);
            const UserTable = this.sequelize.define("UserCol", {
                aNumber: {
                    type: type.INTEGER,
                    defaultValue: defaultFunction
                }
            }, { timestamps: true });

            return UserTable.sync({ force: true }).then(() => {
                return UserTable.create().then((user) => {
                    return UserTable.create().then((user2) => {
                        expect(user.aNumber).to.equal(5);
                        expect(user2.aNumber).to.equal(5);
                        expect(defaultFunction.callCount).to.equal(2);
                    });
                });
            });
        });

        it("should allow me to override updatedAt, createdAt, and deletedAt fields", function () {
            const UserTable = this.sequelize.define("UserCol", {
                aNumber: type.INTEGER
            }, {
                timestamps: true,
                updatedAt: "updatedOn",
                createdAt: "dateCreated",
                deletedAt: "deletedAtThisTime",
                paranoid: true
            });

            return UserTable.sync({ force: true }).then(() => {
                return UserTable.create({ aNumber: 4 }).then((user) => {
                    expect(user.updatedOn).to.exist;
                    expect(user.dateCreated).to.exist;
                    return user.destroy().then(() => {
                        return user.reload({ paranoid: false }).then(() => {
                            expect(user.deletedAtThisTime).to.exist;
                        });
                    });
                });
            });
        });

        it("should allow me to disable some of the timestamp fields", function () {
            const UpdatingUser = this.sequelize.define("UpdatingUser", {
                name: type.STRING
            }, {
                timestamps: true,
                updatedAt: false,
                createdAt: false,
                deletedAt: "deletedAtThisTime",
                paranoid: true
            });

            return UpdatingUser.sync({ force: true }).then(() => {
                return UpdatingUser.create({
                    name: "heyo"
                }).then((user) => {
                    expect(user.createdAt).not.to.exist;
                    expect(user.false).not.to.exist; //  because, you know we might accidentally add a field named 'false'

                    user.name = "heho";
                    return user.save().then((user) => {
                        expect(user.updatedAt).not.to.exist;
                        return user.destroy().then(() => {
                            return user.reload({ paranoid: false }).then(() => {
                                expect(user.deletedAtThisTime).to.exist;
                            });
                        });
                    });
                });
            });
        });

        it("returns proper defaultValues after save when setter is set", function () {
            const titleSetter = spy();
            const Task = this.sequelize.define("TaskBuild", {
                title: {
                    type: new type.STRING(50),
                    allowNull: false,
                    defaultValue: ""
                }
            }, {
                setterMethods: {
                    title: titleSetter
                }
            });

            return Task.sync({ force: true }).then(() => {
                return Task.build().save().then((record) => {
                    expect(record.title).to.be.a("string");
                    expect(record.title).to.equal("");
                    expect(titleSetter.notCalled).to.be.ok; // The setter method should not be invoked for default values
                });
            });
        });

        it("should work with both paranoid and underscored being true", function () {
            const UserTable = this.sequelize.define("UserCol", {
                aNumber: type.INTEGER
            }, {
                paranoid: true,
                underscored: true
            });

            return UserTable.sync({ force: true }).then(() => {
                return UserTable.create({ aNumber: 30 }).then(() => {
                    return UserTable.count().then((c) => {
                        expect(c).to.equal(1);
                    });
                });
            });
        });

        it("allows multiple column unique keys to be defined", function () {
            const User = this.sequelize.define("UserWithUniqueUsername", {
                username: { type: type.STRING, unique: "user_and_email" },
                email: { type: type.STRING, unique: "user_and_email" },
                aCol: { type: type.STRING, unique: "a_and_b" },
                bCol: { type: type.STRING, unique: "a_and_b" }
            });

            return User.sync({
                force: true, logging: _.after(2, _.once((sql) => {
                    if (dialect === "mssql") {
                        expect(sql).to.match(/CONSTRAINT\s*([`"[]?user_and_email[`"\]]?)?\s*UNIQUE\s*\([`"[]?username[`"\]]?, [`"[]?email[`"\]]?\)/);
                        expect(sql).to.match(/CONSTRAINT\s*([`"[]?a_and_b[`"\]]?)?\s*UNIQUE\s*\([`"[]?aCol[`"\]]?, [`"[]?bCol[`"\]]?\)/);
                    } else {
                        expect(sql).to.match(/UNIQUE\s*([`"]?user_and_email[`"]?)?\s*\([`"]?username[`"]?, [`"]?email[`"]?\)/);
                        expect(sql).to.match(/UNIQUE\s*([`"]?a_and_b[`"]?)?\s*\([`"]?aCol[`"]?, [`"]?bCol[`"]?\)/);
                    }
                }))
            });
        });

        it("allows unique on column with field aliases", async function () {
            const User = this.sequelize.define("UserWithUniqueFieldAlias", {
                userName: { type: type.STRING, unique: "user_name_unique", field: "user_name" }
            });
            await User.sync({ force: true });
            const indexes = await this.sequelize.queryInterface.showIndex(User.tableName);
            let idxUnique;
            if (dialect === "sqlite") {
                expect(indexes).to.have.length(1);
                idxUnique = indexes[0];
                expect(idxUnique.primary).to.equal(false);
                expect(idxUnique.unique).to.equal(true);
                expect(idxUnique.fields).to.deep.equal([{ attribute: "user_name", length: undefined, order: undefined }]);
            } else if (dialect === "mysql") {
                expect(indexes).to.have.length(2);
                idxUnique = indexes[1];
                expect(idxUnique.primary).to.equal(false);
                expect(idxUnique.unique).to.equal(true);
                expect(idxUnique.fields).to.deep.equal([{ attribute: "user_name", length: undefined, order: "ASC" }]);
                expect(idxUnique.type).to.equal("BTREE");
            } else if (dialect === "postgres") {
                expect(indexes).to.have.length(2);
                idxUnique = indexes[1];
                expect(idxUnique.primary).to.equal(false);
                expect(idxUnique.unique).to.equal(true);
                expect(idxUnique.fields).to.deep.equal([{ attribute: "user_name", collate: undefined, order: undefined, length: undefined }]);
            } else if (dialect === "mssql") {
                expect(indexes).to.have.length(2);
                idxUnique = indexes[1];
                expect(idxUnique.primary).to.equal(false);
                expect(idxUnique.unique).to.equal(true);
                expect(idxUnique.fields).to.deep.equal([{ attribute: "user_name", collate: undefined, length: undefined, order: "ASC" }]);
            }
        });

        it("allows us to customize the error message for unique constraint", async function () {
            const self = this;
            const User = this.sequelize.define("UserWithUniqueUsername", {
                username: { type: type.STRING, unique: { name: "user_and_email", msg: "User and email must be unique" } },
                email: { type: type.STRING, unique: "user_and_email" }
            });

            await User.sync({ force: true });
            await assert.throws(async () => {
                await Promise.all([
                    User.create({ username: "tobi", email: "tobi@tobi.me" }),
                    User.create({ username: "tobi", email: "tobi@tobi.me" })
                ]);
            }, self.sequelize.UniqueConstraintError, "User and email must be unique");
        });

        // If you use migrations to create unique indexes that have explicit names and/or contain fields
        // that have underscore in their name. Then sequelize must use the index name to map the custom message to the error thrown from db.
        it("allows us to map the customized error message with unique constraint name", async function () {
            // Fake migration style index creation with explicit index definition
            const self = this;
            let User = this.sequelize.define("UserWithUniqueUsername", {
                user_id: { type: type.INTEGER },
                email: { type: type.STRING }
            }, {
                indexes: [
                    {
                        name: "user_and_email_index",
                        msg: "User and email must be unique",
                        unique: true,
                        method: "BTREE",
                        fields: ["user_id", { attribute: "email", collate: dialect === "sqlite" ? "RTRIM" : "en_US", order: "DESC", length: 5 }]
                    }]
            });

            await User.sync({ force: true });

            // Redefine the model to use the index in database and override error message
            User = self.sequelize.define("UserWithUniqueUsername", {
                user_id: { type: type.INTEGER, unique: { name: "user_and_email_index", msg: "User and email must be unique" } },
                email: { type: type.STRING, unique: "user_and_email_index" }
            });
            await assert.throws(async () => {
                await Promise.all([
                    User.create({ user_id: 1, email: "tobi@tobi.me" }),
                    User.create({ user_id: 1, email: "tobi@tobi.me" })
                ]);
            }, self.sequelize.UniqueConstraintError, "User and email must be unique");
        });

        it("should allow the user to specify indexes in options", async function () {
            // this.retries(3); // ?
            const indices = [{
                name: "a_b_uniq",
                unique: true,
                method: "BTREE",
                fields: ["fieldB", { attribute: "fieldA", collate: dialect === "sqlite" ? "RTRIM" : "en_US", order: "DESC", length: 5 }]
            }];

            if (dialect !== "mssql") {
                indices.push({
                    type: "FULLTEXT",
                    fields: ["fieldC"],
                    concurrently: true
                });

                indices.push({
                    type: "FULLTEXT",
                    fields: ["fieldD"]
                });
            }

            const Model = this.sequelize.define("model", {
                fieldA: type.STRING,
                fieldB: type.INTEGER,
                fieldC: type.STRING,
                fieldD: type.STRING
            }, {
                indexes: indices,
                engine: "MyISAM"
            });

            await this.sequelize.sync();
            await this.sequelize.sync(); // The second call should not try to create the indices again
            const result = await this.sequelize.queryInterface.showIndex(Model.tableName);
            let primary;
            let idx1;
            let idx2;
            let idx3;

            if (dialect === "sqlite") {
                // PRAGMA index_info does not return the primary index
                idx1 = result[0];
                idx2 = result[1];

                expect(idx1.fields).to.deep.equal([
                    { attribute: "fieldB", length: undefined, order: undefined },
                    { attribute: "fieldA", length: undefined, order: undefined }
                ]);

                expect(idx2.fields).to.deep.equal([
                    { attribute: "fieldC", length: undefined, order: undefined }
                ]);
            } else if (dialect === "mssql") {
                idx1 = result[0];

                expect(idx1.fields).to.deep.equal([
                    { attribute: "fieldB", length: undefined, order: "ASC", collate: undefined },
                    { attribute: "fieldA", length: undefined, order: "DESC", collate: undefined }
                ]);
            } else if (dialect === "postgres") {
                // Postgres returns indexes in alphabetical order
                primary = result[2];
                idx1 = result[0];
                idx2 = result[1];
                idx3 = result[2];

                expect(idx1.fields).to.deep.equal([
                    { attribute: "fieldB", length: undefined, order: undefined, collate: undefined },
                    { attribute: "fieldA", length: undefined, order: "DESC", collate: "en_US" }
                ]);

                expect(idx2.fields).to.deep.equal([
                    { attribute: "fieldC", length: undefined, order: undefined, collate: undefined }
                ]);

                expect(idx3.fields).to.deep.equal([
                    { attribute: "fieldD", length: undefined, order: undefined, collate: undefined }
                ]);
            } else {
                // And finally mysql returns the primary first, and then the rest in the order they were defined
                primary = result[0];
                idx1 = result[1];
                idx2 = result[2];

                expect(primary.primary).to.be.ok;

                expect(idx1.type).to.equal("BTREE");
                expect(idx2.type).to.equal("FULLTEXT");

                expect(idx1.fields).to.deep.equal([
                    { attribute: "fieldB", length: undefined, order: "ASC" },
                    { attribute: "fieldA", length: 5, order: "ASC" }
                ]);

                expect(idx2.fields).to.deep.equal([
                    { attribute: "fieldC", length: undefined, order: undefined }
                ]);
            }

            expect(idx1.name).to.equal("a_b_uniq");
            expect(idx1.unique).to.be.ok;

            if (dialect !== "mssql") {
                expect(idx2.name).to.equal("models_field_c");
                expect(idx2.unique).not.to.be.ok;
            }
        });
    });

    describe("build", () => {
        it("doesn't create database entries", function () {
            this.User.build({ username: "John Wayne" });
            return this.User.findAll().then((users) => {
                expect(users).to.have.length(0);
            });
        });

        it("fills the objects with default values", function () {
            const Task = this.sequelize.define("TaskBuild", {
                title: { type: type.STRING, defaultValue: "a task!" },
                foo: { type: type.INTEGER, defaultValue: 2 },
                bar: { type: type.DATE },
                foobar: { type: type.TEXT, defaultValue: "asd" },
                flag: { type: type.BOOLEAN, defaultValue: false }
            });

            expect(Task.build().title).to.equal("a task!");
            expect(Task.build().foo).to.equal(2);
            expect(Task.build().bar).to.not.be.ok;
            expect(Task.build().foobar).to.equal("asd");
            expect(Task.build().flag).to.be.false;
        });

        it("fills the objects with default values", function () {
            const Task = this.sequelize.define("TaskBuild", {
                title: { type: type.STRING, defaultValue: "a task!" },
                foo: { type: type.INTEGER, defaultValue: 2 },
                bar: { type: type.DATE },
                foobar: { type: type.TEXT, defaultValue: "asd" },
                flag: { type: type.BOOLEAN, defaultValue: false }
            }, { timestamps: false });
            expect(Task.build().title).to.equal("a task!");
            expect(Task.build().foo).to.equal(2);
            expect(Task.build().bar).to.not.be.ok;
            expect(Task.build().foobar).to.equal("asd");
            expect(Task.build().flag).to.be.false;
        });

        it("attaches getter and setter methods from attribute definition", function () {
            const Product = this.sequelize.define("ProductWithSettersAndGetters1", {
                price: {
                    type: type.INTEGER,
                    get() {
                        return `answer = ${this.getDataValue("price")}`;
                    },
                    set(v) {
                        return this.setDataValue("price", v + 42);
                    }
                }
            });

            expect(Product.build({ price: 42 }).price).to.equal("answer = 84");

            const p = Product.build({ price: 1 });
            expect(p.price).to.equal("answer = 43");

            p.price = 0;
            expect(p.price).to.equal("answer = 42");
        });

        it("attaches getter and setter methods from options", function () {
            const Product = this.sequelize.define("ProductWithSettersAndGetters2", {
                priceInCents: type.INTEGER
            }, {
                setterMethods: {
                    price(value) {
                        this.dataValues.priceInCents = value * 100;
                    }
                },
                getterMethods: {
                    price() {
                        return `$${this.getDataValue("priceInCents") / 100}`;
                    },

                    priceInCents() {
                        return this.dataValues.priceInCents;
                    }
                }
            });

            expect(Product.build({ price: 20 }).priceInCents).to.equal(20 * 100);
            expect(Product.build({ priceInCents: 30 * 100 }).price).to.equal(`$${30}`);
        });

        it("attaches getter and setter methods from options only if not defined in attribute", function () {
            const Product = this.sequelize.define("ProductWithSettersAndGetters3", {
                price1: {
                    type: type.INTEGER,
                    set(v) {
                        this.setDataValue("price1", v * 10);
                    }
                },
                price2: {
                    type: type.INTEGER,
                    get() {
                        return this.getDataValue("price2") * 10;
                    }
                }
            }, {
                setterMethods: {
                    price1(v) {
                        this.setDataValue("price1", v * 100);
                    }
                },
                getterMethods: {
                    price2() {
                        return `$${this.getDataValue("price2")}`;
                    }
                }
            });

            const p = Product.build({ price1: 1, price2: 2 });

            expect(p.price1).to.equal(10);
            expect(p.price2).to.equal(20);
        });

        describe("include", () => {
            it("should support basic includes", function () {
                const Product = this.sequelize.define("Product", {
                    title: type.STRING
                });
                const Tag = this.sequelize.define("Tag", {
                    name: type.STRING
                });
                const User = this.sequelize.define("User", {
                    first_name: type.STRING,
                    last_name: type.STRING
                });

                Product.hasMany(Tag);
                Product.belongsTo(User);

                const product = Product.build({
                    id: 1,
                    title: "Chair",
                    Tags: [
                        { id: 1, name: "Alpha" },
                        { id: 2, name: "Beta" }
                    ],
                    User: {
                        id: 1,
                        first_name: "Mick",
                        last_name: "Hansen"
                    }
                }, {
                    include: [
                        User,
                        Tag
                    ]
                });

                expect(product.Tags).to.be.ok;
                expect(product.Tags.length).to.equal(2);
                expect(product.Tags[0]).to.be.instanceof(Tag);
                expect(product.User).to.be.ok;
                expect(product.User).to.be.instanceof(User);
            });

            it("should support includes with aliases", function () {
                const Product = this.sequelize.define("Product", {
                    title: type.STRING
                });
                const Tag = this.sequelize.define("Tag", {
                    name: type.STRING
                });
                const User = this.sequelize.define("User", {
                    first_name: type.STRING,
                    last_name: type.STRING
                });

                Product.hasMany(Tag, { as: "categories" });
                Product.belongsToMany(User, { as: "followers", through: "product_followers" });
                User.belongsToMany(Product, { as: "following", through: "product_followers" });

                const product = Product.build({
                    id: 1,
                    title: "Chair",
                    categories: [
                        { id: 1, name: "Alpha" },
                        { id: 2, name: "Beta" },
                        { id: 3, name: "Charlie" },
                        { id: 4, name: "Delta" }
                    ],
                    followers: [
                        {
                            id: 1,
                            first_name: "Mick",
                            last_name: "Hansen"
                        },
                        {
                            id: 2,
                            first_name: "Jan",
                            last_name: "Meier"
                        }
                    ]
                }, {
                    include: [
                        { model: User, as: "followers" },
                        { model: Tag, as: "categories" }
                    ]
                });

                expect(product.categories).to.be.ok;
                expect(product.categories.length).to.equal(4);
                expect(product.categories[0]).to.be.instanceof(Tag);
                expect(product.followers).to.be.ok;
                expect(product.followers.length).to.equal(2);
                expect(product.followers[0]).to.be.instanceof(User);
            });
        });
    });

    describe("findOne", () => {
        if (current.dialect.supports.transactions) {
            it("supports the transaction option in the first parameter", async function () {
                const sequelize = await Support.prepareTransactionTest(this.sequelize);
                const User = sequelize.define("User", { username: type.STRING, foo: type.STRING });
                await User.sync({ force: true });
                const t = await sequelize.transaction();
                await User.create({ username: "foo" }, { transaction: t });
                const user = await User.findOne({ where: { username: "foo" }, transaction: t });
                expect(user).to.not.be.null;
                await t.rollback();
            });
        }

        it("should not fail if model is paranoid and where is an empty array", function () {
            const User = this.sequelize.define("User", { username: type.STRING }, { paranoid: true });

            return User.sync({ force: true })
                .then(() => {
                    return User.create({ username: "A fancy name" });
                })
                .then(() => {
                    return User.findOne({ where: [] });
                })
                .then((u) => {
                    expect(u.username).to.equal("A fancy name");
                });
        });

        // https://github.com/sequelize/sequelize/issues/8406
        it("should work if model is paranoid and only operator in where clause is a Symbol", function () {
            const User = this.sequelize.define("User", { username: type.STRING }, { paranoid: true });

            return User.sync({ force: true })
                .then(() => {
                    return User.create({ username: "foo" });
                })
                .then(() => {
                    return User.findOne({
                        where: {
                            [orm.operator.or]: [
                                { username: "bar" },
                                { username: "baz" }
                            ]
                        }
                    });
                })
                .then((user) => {
                    expect(user).to.not.be.ok;
                });
        });
    });

    describe("findOrInitialize", () => {

        if (current.dialect.supports.transactions) {
            it("supports transactions", async function () {
                const sequelize = await Support.prepareTransactionTest(this.sequelize);
                const User = sequelize.define("User", { username: type.STRING, foo: type.STRING });
                await User.sync({ force: true });
                const t = await sequelize.transaction();
                await User.create({ username: "foo" }, { transaction: t });
                const [user1] = await User.findOrInitialize({
                    where: { username: "foo" }
                });
                const [user2] = await User.findOrInitialize({
                    where: { username: "foo" },
                    transaction: t
                });
                const [user3] = await User.findOrInitialize({
                    where: { username: "foo" },
                    defaults: { foo: "asd" },
                    transaction: t
                });
                expect(user1.isNewRecord).to.be.true;
                expect(user2.isNewRecord).to.be.false;
                expect(user3.isNewRecord).to.be.false;
                await t.commit();
            });
        }

        describe("returns an instance if it already exists", () => {
            it("with a single find field", async function () {
                const self = this;

                const user = await this.User.create({ username: "Username" });
                const [_user, initialized] = await self.User.findOrInitialize({
                    where: { username: user.username }
                });
                expect(_user.id).to.equal(user.id);
                expect(_user.username).to.equal("Username");
                expect(initialized).to.be.false;
            });

            it("with multiple find fields", async function () {
                const self = this;

                const user = await this.User.create({ username: "Username", data: "data" });
                const [_user, initialized] = await self.User.findOrInitialize({
                    where: {
                        username: user.username,
                        data: user.data
                    }
                });
                expect(_user.id).to.equal(user.id);
                expect(_user.username).to.equal("Username");
                expect(_user.data).to.equal("data");
                expect(initialized).to.be.false;
            });

            it("builds a new instance with default value.", async function () {
                const data = {
                    username: "Username"
                };
                const defaultValues = {
                    data: "ThisIsData"
                };

                const [user, initialized] = await this.User.findOrInitialize({
                    where: data,
                    defaults: defaultValues
                });
                expect(user.id).to.be.null;
                expect(user.username).to.equal("Username");
                expect(user.data).to.equal("ThisIsData");
                expect(initialized).to.be.true;
                expect(user.isNewRecord).to.be.true;
            });
        });
    });

    describe("update", () => {
        it("throws an error if no where clause is given", function () {
            const User = this.sequelize.define("User", { username: type.STRING });

            return this.sequelize.sync({ force: true }).then(() => {
                return User.update();
            }).then(() => {
                throw new Error("Update should throw an error if no where clause is given.");
            }, (err) => {
                expect(err).to.be.an.instanceof(Error);
                expect(err.message).to.equal("Missing where attribute in the options parameter");
            });
        });

        if (current.dialect.supports.transactions) {
            it("supports transactions", async function () {
                const sequelize = await Support.prepareTransactionTest(this.sequelize);
                const User = sequelize.define("User", { username: type.STRING });

                await User.sync({ force: true });
                await User.create({ username: "foo" });
                const t = await sequelize.transaction();
                await User.update({ username: "bar" }, { where: { username: "foo" }, transaction: t });
                const users1 = await User.findAll();
                const users2 = await User.findAll({ transaction: t });
                expect(users1[0].username).to.equal("foo");
                expect(users2[0].username).to.equal("bar");
                await t.rollback();
            });
        }

        it("updates the attributes that we select only without updating createdAt", function () {
            const User = this.sequelize.define("User1", {
                username: type.STRING,
                secretValue: type.STRING
            }, {
                paranoid: true
            });

            let test = false;
            return User.sync({ force: true }).then(() => {
                return User.create({ username: "Peter", secretValue: "42" }).then((user) => {
                    return user.updateAttributes({ secretValue: "43" }, {
                        fields: ["secretValue"], logging(sql) {
                            test = true;
                            if (dialect === "mssql") {
                                expect(sql).to.not.contain("createdAt");
                            } else {
                                expect(sql).to.match(/UPDATE\s+[`"]+User1s[`"]+\s+SET\s+[`"]+secretValue[`"]='43',[`"]+updatedAt[`"]+='[^`",]+'\s+WHERE [`"]+id[`"]+\s=\s1/);
                            }
                        }
                    });
                });
            }).then(() => {
                expect(test).to.be.true;
            });
        });

        it("allows sql logging of updated statements", function () {
            const User = this.sequelize.define("User", {
                name: type.STRING,
                bio: type.TEXT
            }, {
                paranoid: true
            });
            let test = false;
            return User.sync({ force: true }).then(() => {
                return User.create({ name: "meg", bio: "none" }).then((u) => {
                    expect(u).to.exist;
                    return u.updateAttributes({ name: "brian" }, {
                        logging(sql) {
                            test = true;
                            expect(sql).to.exist;
                            expect(sql.toUpperCase().indexOf("UPDATE")).to.be.above(-1);
                        }
                    });
                });
            }).then(() => {
                expect(test).to.be.true;
            });
        });

        it("updates only values that match filter", function () {
            const self = this,
                data = [{ username: "Peter", secretValue: "42" },
                    { username: "Paul", secretValue: "42" },
                    { username: "Bob", secretValue: "43" }];

            return this.User.bulkCreate(data).then(() => {
                return self.User.update({ username: "Bill" }, { where: { secretValue: "42" } }).then(() => {
                    return self.User.findAll({ order: ["id"] }).then((users) => {
                        expect(users.length).to.equal(3);

                        users.forEach((user) => {
                            if (user.secretValue === "42") {
                                expect(user.username).to.equal("Bill");
                            } else {
                                expect(user.username).to.equal("Bob");
                            }
                        });

                    });
                });
            });
        });

        it("updates only values that match the allowed fields", function () {
            const self = this,
                data = [{ username: "Peter", secretValue: "42" }];

            return this.User.bulkCreate(data).then(() => {
                return self.User.update({ username: "Bill", secretValue: "43" }, { where: { secretValue: "42" }, fields: ["username"] }).then(() => {
                    return self.User.findAll({ order: ["id"] }).then((users) => {
                        expect(users.length).to.equal(1);

                        const user = users[0];
                        expect(user.username).to.equal("Bill");
                        expect(user.secretValue).to.equal("42");
                    });
                });
            });
        });

        it("updates with casting", function () {
            const self = this;
            return this.User.create({
                username: "John"
            }).then(() => {
                return self.User.update({ username: self.sequelize.cast("1", dialect === "mssql" ? "nvarchar" : "char") }, { where: { username: "John" } }).then(() => {
                    return self.User.findAll().then((users) => {
                        expect(users[0].username).to.equal("1");
                    });
                });
            });
        });

        it("updates with function and column value", function () {
            const self = this;

            return this.User.create({
                username: "John"
            }).then(() => {
                return self.User.update({ username: self.sequelize.fn("upper", self.sequelize.col("username")) }, { where: { username: "John" } }).then(() => {
                    return self.User.findAll().then((users) => {
                        expect(users[0].username).to.equal("JOHN");
                    });
                });
            });
        });

        it("does not update virtual attributes", async function () {
            const User = this.sequelize.define("User", {
                username: type.STRING,
                virtual: type.VIRTUAL
            });

            await User.create({
                username: "jan"
            });
            await User.update({
                username: "kurt",
                virtual: "test"
            }, {
                where: {
                    username: "jan"
                }
            });
            const [user] = await User.findAll();
            expect(user.username).to.equal("kurt");
        });

        it("doesn't update attributes that are altered by virtual setters when option is enabled", async function () {
            const User = this.sequelize.define("UserWithVirtualSetters", {
                username: type.STRING,
                illness_name: type.STRING,
                illness_pain: type.INTEGER,
                illness: {
                    type: type.VIRTUAL,
                    set(value) {
                        this.set("illness_name", value.name);
                        this.set("illness_pain", value.pain);
                    }
                }
            });

            await User.sync({ force: true });
            await User.create({
                username: "Jan",
                illness_name: "Headache",
                illness_pain: 5
            });
            await User.update({
                illness: { pain: 10, name: "Backache" }
            }, {
                where: {
                    username: "Jan"
                },
                sideEffects: false
            });
            const [user] = await User.findAll();
            expect(user.illness_pain).to.be.equal(5);
        });

        it("updates attributes that are altered by virtual setters", async function () {
            const User = this.sequelize.define("UserWithVirtualSetters", {
                username: type.STRING,
                illness_name: type.STRING,
                illness_pain: type.INTEGER,
                illness: {
                    type: type.VIRTUAL,
                    set(value) {
                        this.set("illness_name", value.name);
                        this.set("illness_pain", value.pain);
                    }
                }
            });

            await User.sync({ force: true });
            await User.create({
                username: "Jan",
                illness_name: "Headache",
                illness_pain: 5
            });
            await User.update({
                illness: { pain: 10, name: "Backache" }
            }, {
                where: {
                    username: "Jan"
                }
            });
            const [user] = await User.findAll();
            expect(user.illness_pain).to.be.equal(10);
        });

        it("should properly set data when individualHooks are true", function () {
            const self = this;

            self.User.beforeUpdate((instance) => {
                instance.set("intVal", 1);
            });

            return self.User.create({ username: "Peter" }).then((user) => {
                return self.User.update({ data: "test" }, { where: { id: user.id }, individualHooks: true }).then(() => {
                    return self.User.findById(user.id).then((userUpdated) => {
                        expect(userUpdated.intVal).to.be.equal(1);
                    });
                });
            });
        });

        it("sets updatedAt to the current timestamp", async function () {
            const data = [
                { username: "Peter", secretValue: "42" },
                { username: "Paul", secretValue: "42" },
                { username: "Bob", secretValue: "43" }
            ];

            await this.User.bulkCreate(data);
            const users = await this.User.findAll({ order: ["id"] });
            const updatedAt = users[0].updatedAt;
            expect(updatedAt).to.be.ok;
            expect(updatedAt.getTime()).to.be.equal(users[2].updatedAt.getTime()); // All users should have the same updatedAt

            // Pass the time so we can actually see a change
            this.clock.tick(1000);
            await this.User.update({ username: "Bill" }, { where: { secretValue: "42" } });
            {
                const users = await this.User.findAll({ order: ["id"] });
                expect(users[0].username).to.equal("Bill");
                expect(users[1].username).to.equal("Bill");
                expect(users[2].username).to.equal("Bob");

                expect(users[0].updatedAt.getTime()).to.be.greaterThan(updatedAt.getTime());
                expect(users[2].updatedAt.getTime()).to.be.equal(updatedAt.getTime());
            }
        });

        it("returns the number of affected rows", async function () {
            const self = this;
            const data = [
                { username: "Peter", secretValue: "42" },
                { username: "Paul", secretValue: "42" },
                { username: "Bob", secretValue: "43" }
            ];

            await this.User.bulkCreate(data);
            {
                const [affectedRows] = await self.User.update({ username: "Bill" }, { where: { secretValue: "42" } });
                expect(affectedRows).to.equal(2);
            }
            {
                const [affectedRows] = await self.User.update({ username: "Bill" }, { where: { secretValue: "44" } });
                expect(affectedRows).to.equal(0);
            }
        });

        if (dialect === "postgres") {
            it("returns the affected rows if `options.returning` is true", async function () {
                const self = this;
                const data = [
                    { username: "Peter", secretValue: "42" },
                    { username: "Paul", secretValue: "42" },
                    { username: "Bob", secretValue: "43" }
                ];

                await this.User.bulkCreate(data);
                {
                    const [count, rows] = await self.User.update({ username: "Bill" }, { where: { secretValue: "42" }, returning: true });
                    expect(count).to.equal(2);
                    expect(rows).to.have.length(2);
                }
                {
                    const [count, rows] = await self.User.update({ username: "Bill" }, { where: { secretValue: "44" }, returning: true });
                    expect(count).to.equal(0);
                    expect(rows).to.have.length(0);
                }
            });
        }

        if (dialect === "mysql") {
            it("supports limit clause", async function () {
                const self = this;
                const data = [
                    { username: "Peter", secretValue: "42" },
                    { username: "Peter", secretValue: "42" },
                    { username: "Peter", secretValue: "42" }
                ];

                await this.User.bulkCreate(data);
                const [affectedRows] = await self.User.update({ secretValue: "43" }, { where: { username: "Peter" }, limit: 1 });
                expect(affectedRows).to.equal(1);
            });
        }
    });

    describe("destroy", () => {
        it("convenient method `truncate` should clear the table", async function () {
            const User = this.sequelize.define("User", { username: type.STRING });
            const data = [
                { username: "user1" },
                { username: "user2" }
            ];

            await this.sequelize.sync({ force: true });
            await User.bulkCreate(data);
            await User.truncate();
            expect(await User.findAll()).to.be.empty;
        });

        it("truncate should clear the table", async function () {
            const User = this.sequelize.define("User", { username: type.STRING });
            const data = [
                { username: "user1" },
                { username: "user2" }
            ];

            await this.sequelize.sync({ force: true });
            await User.bulkCreate(data);
            await User.destroy({ truncate: true });
            expect(await User.findAll()).to.be.empty;
        });

        it("throws an error if no where clause is given", function () {
            const User = this.sequelize.define("User", { username: type.STRING });

            return this.sequelize.sync({ force: true }).then(() => {
                return User.destroy();
            }).then(() => {
                throw new Error("Destroy should throw an error if no where clause is given.");
            }, (err) => {
                expect(err).to.be.an.instanceof(Error);
                expect(err.message).to.equal("Missing where or truncate attribute in the options parameter of model.destroy.");
            });
        });

        it("deletes all instances when given an empty where object", function () {
            const User = this.sequelize.define("User", { username: type.STRING }),
                data = [
                    { username: "user1" },
                    { username: "user2" }
                ];

            return this.sequelize.sync({ force: true }).then(() => {
                return User.bulkCreate(data);
            }).then(() => {
                return User.destroy({ where: {} });
            }).then((affectedRows) => {
                expect(affectedRows).to.equal(2);
                return User.findAll();
            }).then((users) => {
                expect(users).to.have.length(0);
            });
        });

        if (current.dialect.supports.transactions) {
            it("supports transactions", async function () {
                const sequelize = await Support.prepareTransactionTest(this.sequelize);
                const User = sequelize.define("User", { username: type.STRING });

                await User.sync({ force: true });
                await User.create({ username: "foo" });
                const t = await sequelize.transaction();
                await User.destroy({
                    where: {},
                    transaction: t
                });
                const count1 = await User.count();
                const count2 = await User.count({ transaction: t });
                expect(count1).to.equal(1);
                expect(count2).to.equal(0);
                await t.rollback();
            });
        }

        it("deletes values that match filter", function () {
            const self = this,
                data = [{ username: "Peter", secretValue: "42" },
                    { username: "Paul", secretValue: "42" },
                    { username: "Bob", secretValue: "43" }];

            return this.User.bulkCreate(data).then(() => {
                return self.User.destroy({ where: { secretValue: "42" } })
                    .then(() => {
                        return self.User.findAll({ order: ["id"] }).then((users) => {
                            expect(users.length).to.equal(1);
                            expect(users[0].username).to.equal("Bob");
                        });
                    });
            });
        });

        it("works without a primary key", function () {
            const Log = this.sequelize.define("Log", {
                client_id: type.INTEGER,
                content: type.TEXT,
                timestamp: type.DATE
            });
            Log.removeAttribute("id");

            return Log.sync({ force: true }).then(() => {
                return Log.create({
                    client_id: 13,
                    content: "Error!",
                    timestamp: new Date()
                });
            }).then(() => {
                return Log.destroy({
                    where: {
                        client_id: 13
                    }
                });
            }).then(() => {
                return Log.findAll().then((logs) => {
                    expect(logs.length).to.equal(0);
                });
            });
        });

        it("supports .field", function () {
            const UserProject = this.sequelize.define("UserProject", {
                userId: {
                    type: type.INTEGER,
                    field: "user_id"
                }
            });

            return UserProject.sync({ force: true }).then(() => {
                return UserProject.create({
                    userId: 10
                });
            }).then(() => {
                return UserProject.destroy({
                    where: {
                        userId: 10
                    }
                });
            }).then(() => {
                return UserProject.findAll();
            }).then((userProjects) => {
                expect(userProjects.length).to.equal(0);
            });
        });

        it("sets deletedAt to the current timestamp if paranoid is true", async function () {
            const self = this;
            const qi = this.sequelize.queryInterface.QueryGenerator.quoteIdentifier.bind(this.sequelize.queryInterface.QueryGenerator);
            const ParanoidUser = self.sequelize.define("ParanoidUser", {
                username: type.STRING,
                secretValue: type.STRING,
                data: type.STRING,
                intVal: { type: type.INTEGER, defaultValue: 1 }
            }, {
                paranoid: true
            });
            const data = [
                { username: "Peter", secretValue: "42" },
                { username: "Paul", secretValue: "42" },
                { username: "Bob", secretValue: "43" }
            ];

            await ParanoidUser.sync({ force: true });
            await ParanoidUser.bulkCreate(data);
            const date = adone.datetime().utc().format("YYYY-MM-DD h:mm");
            await ParanoidUser.destroy({ where: { secretValue: "42" } });
            {
                const users = await ParanoidUser.findAll({ order: ["id"] });
                expect(users.length).to.equal(1);
                expect(users[0].username).to.equal("Bob");
            }
            {
                const [users] = await self.sequelize.query(`SELECT * FROM ${qi("ParanoidUsers")} WHERE ${qi("deletedAt")} IS NOT NULL ORDER BY ${qi("id")}`);
                expect(users[0].username).to.equal("Peter");
                expect(users[1].username).to.equal("Paul");

                expect(adone.datetime(new Date(users[0].deletedAt)).utc().format("YYYY-MM-DD h:mm")).to.equal(date);
                expect(adone.datetime(new Date(users[1].deletedAt)).utc().format("YYYY-MM-DD h:mm")).to.equal(date);
            }
        });

        it("does not set deletedAt for previously destroyed instances if paranoid is true", function () {
            const User = this.sequelize.define("UserCol", {
                secretValue: type.STRING,
                username: type.STRING
            }, { paranoid: true });

            return User.sync({ force: true }).then(() => {
                return User.bulkCreate([
                    { username: "Toni", secretValue: "42" },
                    { username: "Tobi", secretValue: "42" },
                    { username: "Max", secretValue: "42" }
                ]).then(() => {
                    return User.findById(1).then((user) => {
                        return user.destroy().then(() => {
                            return user.reload({ paranoid: false }).then(() => {
                                const deletedAt = user.deletedAt;

                                return User.destroy({ where: { secretValue: "42" } }).then(() => {
                                    return user.reload({ paranoid: false }).then(() => {
                                        expect(user.deletedAt).to.eql(deletedAt);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        describe("can't find records marked as deleted with paranoid being true", () => {
            it("with the DAOFactory", function () {
                const User = this.sequelize.define("UserCol", {
                    username: type.STRING
                }, { paranoid: true });

                return User.sync({ force: true }).then(() => {
                    return User.bulkCreate([
                        { username: "Toni" },
                        { username: "Tobi" },
                        { username: "Max" }
                    ]).then(() => {
                        return User.findById(1).then((user) => {
                            return user.destroy().then(() => {
                                return User.findById(1).then((user) => {
                                    expect(user).to.be.null;
                                    return User.count().then((cnt) => {
                                        expect(cnt).to.equal(2);
                                        return User.findAll().then((users) => {
                                            expect(users).to.have.length(2);
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        describe("can find paranoid records if paranoid is marked as false in query", () => {
            it("with the DAOFactory", async function () {
                const User = this.sequelize.define("UserCol", {
                    username: type.STRING
                }, { paranoid: true });

                await User.sync({ force: true });
                await User.bulkCreate([
                    { username: "Toni" },
                    { username: "Tobi" },
                    { username: "Max" }
                ]);
                {
                    const user = await User.findById(1);
                    await user.destroy();
                }
                {
                    const user = await User.find({ where: 1, paranoid: false });
                    expect(user).to.exist;
                }
                {
                    const user = await User.findById(1);
                    expect(user).to.be.null;
                }
                const [cnt, cntWithDeleted] = await Promise.all([User.count(), User.count({ paranoid: false })]);
                expect(cnt).to.equal(2);
                expect(cntWithDeleted).to.equal(3);
            });
        });

        it("should include deleted associated records if include has paranoid marked as false", async function () {
            const User = this.sequelize.define("User", {
                username: type.STRING
            }, { paranoid: true });
            const Pet = this.sequelize.define("Pet", {
                name: type.STRING,
                UserId: type.INTEGER
            }, { paranoid: true });

            User.hasMany(Pet);
            Pet.belongsTo(User);

            await User.sync({ force: true });
            await Pet.sync({ force: true });
            const user = await User.create({ username: "Joe" });
            await Pet.bulkCreate([
                { name: "Fido", UserId: user.id },
                { name: "Fifi", UserId: user.id }
            ]);
            const pet = await Pet.findById(1);
            await pet.destroy();
            const [_user, userWithDeletedPets] = await Promise.all([
                User.find({ where: { id: user.id }, include: Pet }),
                User.find({
                    where: { id: user.id },
                    include: [{ model: Pet, paranoid: false }]
                })
            ]);
            expect(_user).to.exist;
            expect(_user.Pets).to.have.length(1);
            expect(userWithDeletedPets).to.exist;
            expect(userWithDeletedPets.Pets).to.have.length(2);
        });

        it("should delete a paranoid record if I set force to true", async function () {
            const self = this;
            const User = this.sequelize.define("paranoiduser", {
                username: type.STRING
            }, { paranoid: true });

            await User.sync({ force: true });
            await User.bulkCreate([
                { username: "Bob" },
                { username: "Tobi" },
                { username: "Max" },
                { username: "Tony" }
            ]);
            const user = await User.find({ where: { username: "Bob" } });
            await user.destroy({ force: true });
            expect(await User.find({ where: { username: "Bob" } })).to.be.null;
            const tobi = await User.find({ where: { username: "Tobi" } });
            await tobi.destroy();
            let result = await self.sequelize.query("SELECT * FROM paranoidusers WHERE username='Tobi'", { plain: true });
            expect(result.username).to.equal("Tobi");
            await User.destroy({ where: { username: "Tony" } });
            result = await self.sequelize.query("SELECT * FROM paranoidusers WHERE username='Tony'", { plain: true });
            expect(result.username).to.equal("Tony");
            await User.destroy({ where: { username: ["Tony", "Max"] }, force: true });
            const [users] = await self.sequelize.query("SELECT * FROM paranoidusers", { raw: true });
            expect(users).to.have.length(1);
            expect(users[0].username).to.equal("Tobi");
        });

        it("returns the number of affected rows", function () {
            const self = this;
            const data = [
                { username: "Peter", secretValue: "42" },
                { username: "Paul", secretValue: "42" },
                { username: "Bob", secretValue: "43" }
            ];

            return this.User.bulkCreate(data).then(() => {
                return self.User.destroy({ where: { secretValue: "42" } }).then((affectedRows) => {
                    expect(affectedRows).to.equal(2);
                });
            }).then(() => {
                return self.User.destroy({ where: { secretValue: "44" } }).then((affectedRows) => {
                    expect(affectedRows).to.equal(0);
                });
            });
        });

        it("supports table schema/prefix", function () {
            const self = this;
            const data = [
                { username: "Peter", secretValue: "42" },
                { username: "Paul", secretValue: "42" },
                { username: "Bob", secretValue: "43" }
            ];
            const prefixUser = self.User.schema("prefix");

            const run = function () {
                return prefixUser.sync({ force: true }).then(() => {
                    return prefixUser.bulkCreate(data).then(() => {
                        return prefixUser.destroy({ where: { secretValue: "42" } }).then(() => {
                            return prefixUser.findAll({ order: ["id"] }).then((users) => {
                                expect(users.length).to.equal(1);
                                expect(users[0].username).to.equal("Bob");
                            });
                        });
                    });
                });
            };

            return this.sequelize.queryInterface.dropAllSchemas().then(() => {
                return self.sequelize.queryInterface.createSchema("prefix").then(() => {
                    return run.call(self);
                });
            });
        });
    });

    describe("restore", () => {
        it("returns an error if the model is not paranoid", async function () {
            const self = this;

            await this.User.create({ username: "Peter", secretValue: "42" });
            await assert.throws(async () => {
                await self.User.restore({ where: { secretValue: "42" } });
            }, Error, "Model is not paranoid");
        });

        it("restores a previously deleted model", async function () {
            const self = this;
            const ParanoidUser = self.sequelize.define("ParanoidUser", {
                username: type.STRING,
                secretValue: type.STRING,
                data: type.STRING,
                intVal: { type: type.INTEGER, defaultValue: 1 }
            }, {
                paranoid: true
            });
            const data = [
                { username: "Peter", secretValue: "42" },
                { username: "Paul", secretValue: "43" },
                { username: "Bob", secretValue: "44" }
            ];

            await ParanoidUser.sync({ force: true });
            await ParanoidUser.bulkCreate(data);
            await ParanoidUser.destroy({ where: { secretValue: "42" } });
            await ParanoidUser.restore({ where: { secretValue: "42" } });
            const user = await ParanoidUser.find({ where: { secretValue: "42" } });
            expect(user).to.be.ok;
            expect(user.username).to.equal("Peter");
        });
    });

    describe("equals", () => {
        it("correctly determines equality of objects", async function () {
            const u = await this.User.create({ username: "hallo", data: "welt" });
            expect(u.equals(u)).to.be.ok;
        });

        // sqlite can't handle multiple primary keys
        if (dialect !== "sqlite") {
            it("correctly determines equality with multiple primary keys", async function () {
                const userKeys = this.sequelize.define("userkeys", {
                    foo: { type: type.STRING, primaryKey: true },
                    bar: { type: type.STRING, primaryKey: true },
                    name: type.STRING,
                    bio: type.TEXT
                });

                await userKeys.sync({ force: true });
                const u = await userKeys.create({ foo: "1", bar: "2", name: "hallo", bio: "welt" });
                expect(u.equals(u)).to.be.ok;
            });
        }
    });

    describe("equalsOneOf", () => {
        // sqlite can't handle multiple primary keys
        if (dialect !== "sqlite") {
            beforeEach(async function () {
                this.userKey = this.sequelize.define("userKeys", {
                    foo: { type: type.STRING, primaryKey: true },
                    bar: { type: type.STRING, primaryKey: true },
                    name: type.STRING,
                    bio: type.TEXT
                });

                await this.userKey.sync({ force: true });
            });

            it("determines equality if one is matching", async function () {
                const u = await this.userKey.create({ foo: "1", bar: "2", name: "hallo", bio: "welt" });
                expect(u.equalsOneOf([u, { a: 1 }])).to.be.ok;
            });

            it("doesn't determine equality if none is matching", function () {
                return this.userKey.create({ foo: "1", bar: "2", name: "hallo", bio: "welt" }).then((u) => {
                    expect(u.equalsOneOf([{ b: 2 }, { a: 1 }])).to.not.be.ok;
                });
            });
        }
    });

    describe("count", () => {
        if (current.dialect.supports.transactions) {
            it("supports transactions", async function () {
                const sequelize = await Support.prepareTransactionTest(this.sequelize);
                const User = sequelize.define("User", { username: type.STRING });

                await User.sync({ force: true });
                const t = await sequelize.transaction();
                await User.create({ username: "foo" }, { transaction: t });
                const count1 = await User.count();
                const count2 = await User.count({ transaction: t });
                expect(count1).to.equal(0);
                expect(count2).to.equal(1);
                await t.rollback();
            });
        }

        it("counts all created objects", function () {
            const self = this;
            return this.User.bulkCreate([{ username: "user1" }, { username: "user2" }]).then(() => {
                return self.User.count().then((count) => {
                    expect(count).to.equal(2);
                });
            });
        });

        it("returns multiple rows when using group", function () {
            const self = this;
            return this.User.bulkCreate([
                { username: "user1", data: "A" },
                { username: "user2", data: "A" },
                { username: "user3", data: "B" }
            ]).then(() => {
                return self.User.count({
                    attributes: ["data"],
                    group: ["data"]
                }).then((count) => {
                    expect(count.length).to.equal(2);
                });
            });
        });

        describe("options sent to aggregate", () => {
            let options;
            let aggregateSpy;

            beforeEach(function () {
                options = { where: { username: "user1" } };

                aggregateSpy = spy(this.User, "aggregate");
            });

            afterEach(() => {
                expect(aggregateSpy).to.have.been.calledWith(
                    match.any,
                    match.any,
                    match.object.and(match.has("where", { username: "user1" }))
                );

                aggregateSpy.restore();
            });

            it('modifies option "limit" by setting it to null', function () {
                options.limit = 5;

                return this.User.count(options).then(() => {
                    expect(aggregateSpy).to.have.been.calledWith(
                        match.any,
                        match.any,
                        match.object.and(match.has("limit", null))
                    );
                });
            });

            it('modifies option "offset" by setting it to null', function () {
                options.offset = 10;

                return this.User.count(options).then(() => {
                    expect(aggregateSpy).to.have.been.calledWith(
                        match.any,
                        match.any,
                        match.object.and(match.has("offset", null))
                    );
                });
            });

            it('modifies option "order" by setting it to null', function () {
                options.order = "username";

                return this.User.count(options).then(() => {
                    expect(aggregateSpy).to.have.been.calledWith(
                        match.any,
                        match.any,
                        match.object.and(match.has("order", null))
                    );
                });
            });
        });

        it("allows sql logging", function () {
            let test = false;
            return this.User.count({
                logging(sql) {
                    test = true;
                    expect(sql).to.exist;
                    expect(sql.toUpperCase().indexOf("SELECT")).to.be.above(-1);
                }
            }).then(() => {
                expect(test).to.be.true;
            });
        });

        it("filters object", function () {
            const self = this;
            return this.User.create({ username: "user1" }).then(() => {
                return self.User.create({ username: "foo" }).then(() => {
                    return self.User.count({ where: { username: { $like: "%us%" } } }).then((count) => {
                        expect(count).to.equal(1);
                    });
                });
            });
        });

        it("supports distinct option", async function () {
            const Post = this.sequelize.define("Post", {});
            const PostComment = this.sequelize.define("PostComment", {});
            Post.hasMany(PostComment);
            await Post.sync({ force: true });
            await PostComment.sync({ force: true });
            const post = await Post.create({});
            await PostComment.bulkCreate([{ PostId: post.id }, { PostId: post.id }]);
            const [count1, count2] = await Promise.all([
                Post.count({ distinct: false, include: [{ model: PostComment, required: false }] }),
                Post.count({ distinct: true, include: [{ model: PostComment, required: false }] })
            ]);
            expect(count1).to.equal(2);
            expect(count2).to.equal(1);
        });

    });

    describe("min", () => {
        beforeEach(function () {
            const self = this;
            this.UserWithAge = this.sequelize.define("UserWithAge", {
                age: type.INTEGER
            });

            this.UserWithDec = this.sequelize.define("UserWithDec", {
                value: new type.DECIMAL(10, 3)
            });

            return this.UserWithAge.sync({ force: true }).then(() => {
                return self.UserWithDec.sync({ force: true });
            });
        });

        if (current.dialect.supports.transactions) {
            it("supports transactions", async function () {
                const sequelize = await Support.prepareTransactionTest(this.sequelize);
                const User = sequelize.define("User", { age: type.INTEGER });

                await User.sync({ force: true });
                const t = await sequelize.transaction();
                await User.bulkCreate([{ age: 2 }, { age: 5 }, { age: 3 }], { transaction: t });
                const min1 = await User.min("age");
                const min2 = await User.min("age", { transaction: t });
                expect(min1).to.be.not.ok;
                expect(min2).to.equal(2);
                await t.rollback();
            });
        }

        it("should return the min value", function () {
            const self = this;
            return this.UserWithAge.bulkCreate([{ age: 3 }, { age: 2 }]).then(() => {
                return self.UserWithAge.min("age").then((min) => {
                    expect(min).to.equal(2);
                });
            });
        });

        it("allows sql logging", function () {
            let test = false;
            return this.UserWithAge.min("age", {
                logging(sql) {
                    test = true;
                    expect(sql).to.exist;
                    expect(sql.toUpperCase().indexOf("SELECT")).to.be.above(-1);
                }
            }).then(() => {
                expect(test).to.be.true;
            });
        });

        it("should allow decimals in min", function () {
            const self = this;
            return this.UserWithDec.bulkCreate([{ value: 5.5 }, { value: 3.5 }]).then(() => {
                return self.UserWithDec.min("value").then((min) => {
                    expect(min).to.equal(3.5);
                });
            });
        });

        it("should allow strings in min", function () {
            const self = this;
            return this.User.bulkCreate([{ username: "bbb" }, { username: "yyy" }]).then(() => {
                return self.User.min("username").then((min) => {
                    expect(min).to.equal("bbb");
                });
            });
        });

        it("should allow dates in min", function () {
            const self = this;
            return this.User.bulkCreate([{ theDate: new Date(2000, 1, 1) }, { theDate: new Date(1990, 1, 1) }]).then(() => {
                return self.User.min("theDate").then((min) => {
                    expect(min).to.be.a("Date");
                    expect(new Date(1990, 1, 1)).to.be.deep.equal(min);
                });
            });
        });
    });

    describe("max", () => {
        beforeEach(function () {
            const self = this;
            this.UserWithAge = this.sequelize.define("UserWithAge", {
                age: type.INTEGER,
                order: type.INTEGER
            });

            this.UserWithDec = this.sequelize.define("UserWithDec", {
                value: new type.DECIMAL(10, 3)
            });

            return this.UserWithAge.sync({ force: true }).then(() => {
                return self.UserWithDec.sync({ force: true });
            });
        });

        if (current.dialect.supports.transactions) {
            it("supports transactions", async function () {
                const sequelize = await Support.prepareTransactionTest(this.sequelize);
                const User = sequelize.define("User", { age: type.INTEGER });

                await User.sync({ force: true });
                const t = await sequelize.transaction();
                await User.bulkCreate([{ age: 2 }, { age: 5 }, { age: 3 }], { transaction: t });
                const max1 = await User.max("age");
                const max2 = await User.max("age", { transaction: t });
                expect(max1).to.be.not.ok;
                expect(max2).to.equal(5);
                await t.rollback();
            });
        }

        it("should return the max value for a field named the same as an SQL reserved keyword", function () {
            const self = this;
            return this.UserWithAge.bulkCreate([{ age: 2, order: 3 }, { age: 3, order: 5 }]).then(() => {
                return self.UserWithAge.max("order").then((max) => {
                    expect(max).to.equal(5);
                });
            });
        });

        it("should return the max value", function () {
            const self = this;
            return self.UserWithAge.bulkCreate([{ age: 2 }, { age: 3 }]).then(() => {
                return self.UserWithAge.max("age").then((max) => {
                    expect(max).to.equal(3);
                });
            });
        });

        it("should allow decimals in max", function () {
            const self = this;
            return this.UserWithDec.bulkCreate([{ value: 3.5 }, { value: 5.5 }]).then(() => {
                return self.UserWithDec.max("value").then((max) => {
                    expect(max).to.equal(5.5);
                });
            });
        });

        it("should allow dates in max", function () {
            const self = this;
            return this.User.bulkCreate([
                { theDate: new Date(2013, 11, 31) },
                { theDate: new Date(2000, 1, 1) }
            ]).then(() => {
                return self.User.max("theDate").then((max) => {
                    expect(max).to.be.a("Date");
                    expect(max).to.be.deep.equal(new Date(2013, 11, 31));
                });
            });
        });

        it("should allow strings in max", function () {
            const self = this;
            return this.User.bulkCreate([{ username: "aaa" }, { username: "zzz" }]).then(() => {
                return self.User.max("username").then((max) => {
                    expect(max).to.equal("zzz");
                });
            });
        });

        it("allows sql logging", function () {
            let logged = false;
            return this.UserWithAge.max("age", {
                logging(sql) {
                    expect(sql).to.exist;
                    logged = true;
                    expect(sql.toUpperCase().indexOf("SELECT")).to.be.above(-1);
                }
            }).then(() => {
                expect(logged).to.true;
            });
        });
    });

    describe("sum", () => {
        beforeEach(function () {
            this.UserWithAge = this.sequelize.define("UserWithAge", {
                age: type.INTEGER,
                order: type.INTEGER,
                gender: new type.ENUM("male", "female")
            });

            this.UserWithDec = this.sequelize.define("UserWithDec", {
                value: new type.DECIMAL(10, 3)
            });

            this.UserWithFields = this.sequelize.define("UserWithFields", {
                age: {
                    type: type.INTEGER,
                    field: "user_age"
                },
                order: type.INTEGER,
                gender: {
                    type: new type.ENUM("male", "female"),
                    field: "male_female"
                }
            });

            return Promise.all([
                this.UserWithAge.sync({ force: true }),
                this.UserWithDec.sync({ force: true }),
                this.UserWithFields.sync({ force: true })
            ]);
        });

        it("should return the sum of the values for a field named the same as an SQL reserved keyword", function () {
            const self = this;
            return this.UserWithAge.bulkCreate([{ age: 2, order: 3 }, { age: 3, order: 5 }]).then(() => {
                return self.UserWithAge.sum("order").then((sum) => {
                    expect(sum).to.equal(8);
                });
            });
        });

        it("should return the sum of a field in various records", function () {
            const self = this;
            return self.UserWithAge.bulkCreate([{ age: 2 }, { age: 3 }]).then(() => {
                return self.UserWithAge.sum("age").then((sum) => {
                    expect(sum).to.equal(5);
                });
            });
        });

        it("should allow decimals in sum", function () {
            const self = this;
            return this.UserWithDec.bulkCreate([{ value: 3.5 }, { value: 5.25 }]).then(() => {
                return self.UserWithDec.sum("value").then((sum) => {
                    expect(sum).to.equal(8.75);
                });
            });
        });

        it("should accept a where clause", function () {
            const options = { where: { gender: "male" } };

            const self = this;
            return self.UserWithAge.bulkCreate([{ age: 2, gender: "male" }, { age: 3, gender: "female" }]).then(() => {
                return self.UserWithAge.sum("age", options).then((sum) => {
                    expect(sum).to.equal(2);
                });
            });
        });

        it("should accept a where clause with custom fields", async function () {
            await this.UserWithFields.bulkCreate([
                { age: 2, gender: "male" },
                { age: 3, gender: "female" }
            ]);

            expect(await this.UserWithFields.sum("age", {
                where: { gender: "male" }
            })).to.be.equal(2);
        });

        it("allows sql logging", function () {
            let logged = false;
            return this.UserWithAge.sum("age", {
                logging(sql) {
                    expect(sql).to.exist;
                    logged = true;
                    expect(sql.toUpperCase().indexOf("SELECT")).to.be.above(-1);
                }
            }).then(() => {
                expect(logged).to.true;
            });
        });
    });

    describe("schematic support", () => {
        beforeEach(function () {
            const self = this;

            this.UserPublic = this.sequelize.define("UserPublic", {
                age: type.INTEGER
            });

            this.UserSpecial = this.sequelize.define("UserSpecial", {
                age: type.INTEGER
            });

            return self.sequelize.dropAllSchemas().then(() => {
                return self.sequelize.createSchema("schema_test").then(() => {
                    return self.sequelize.createSchema("special").then(() => {
                        return self.UserSpecial.schema("special").sync({ force: true }).then((UserSpecialSync) => {
                            self.UserSpecialSync = UserSpecialSync;
                        });
                    });
                });
            });
        });

        it("should be able to drop with schemas", function () {
            return this.UserSpecial.drop();
        });

        it("should be able to list schemas", function () {
            return this.sequelize.showAllSchemas().then((schemas) => {
                expect(schemas).to.be.instanceof(Array);

                // FIXME: reenable when schema support is properly added
                if (dialect !== "mssql") {
                    // sqlite & MySQL doesn't actually create schemas unless Model.sync() is called
                    // Postgres supports schemas natively
                    expect(schemas).to.have.length(dialect === "postgres" ? 2 : 1);
                }

            });
        });

        if (dialect === "mysql" || dialect === "sqlite") {
            it("should take schemaDelimiter into account if applicable", function () {
                let test = 0;
                const UserSpecialUnderscore = this.sequelize.define("UserSpecialUnderscore", { age: type.INTEGER }, { schema: "hello", schemaDelimiter: "_" });
                const UserSpecialDblUnderscore = this.sequelize.define("UserSpecialDblUnderscore", { age: type.INTEGER });
                return UserSpecialUnderscore.sync({ force: true }).then((User) => {
                    return UserSpecialDblUnderscore.schema("hello", "__").sync({ force: true }).then((DblUser) => {
                        return DblUser.create({ age: 3 }, {
                            logging(sql) {
                                expect(sql).to.exist;
                                test++;
                                expect(sql.indexOf("INSERT INTO `hello__UserSpecialDblUnderscores`")).to.be.above(-1);
                            }
                        }).then(() => {
                            return User.create({ age: 3 }, {
                                logging(sql) {
                                    expect(sql).to.exist;
                                    test++;
                                    expect(sql.indexOf("INSERT INTO `hello_UserSpecialUnderscores`")).to.be.above(-1);
                                }
                            });
                        });
                    }).then(() => {
                        expect(test).to.equal(2);
                    });
                });
            });
        }

        it("should describeTable using the default schema settings", function () {
            const self = this;
            const UserPublic = this.sequelize.define("Public", {
                username: type.STRING
            });
            let count = 0;

            return UserPublic.sync({ force: true }).then(() => {
                return UserPublic.schema("special").sync({ force: true }).then(() => {
                    return self.sequelize.queryInterface.describeTable("Publics", {
                        logging(sql) {
                            if (dialect === "sqlite" || dialect === "mysql" || dialect === "mssql") {
                                expect(sql).to.not.contain("special");
                                count++;
                            }
                        }
                    }).then((table) => {
                        if (dialect === "postgres") {
                            expect(table.id.defaultValue).to.not.contain("special");
                            count++;
                        }
                        return self.sequelize.queryInterface.describeTable("Publics", {
                            schema: "special",
                            logging(sql) {
                                if (dialect === "sqlite" || dialect === "mysql" || dialect === "mssql") {
                                    expect(sql).to.contain("special");
                                    count++;
                                }
                            }
                        }).then((table) => {
                            if (dialect === "postgres") {
                                expect(table.id.defaultValue).to.contain("special");
                                count++;
                            }
                        });
                    }).then(() => {
                        expect(count).to.equal(2);
                    });
                });
            });
        });

        it("should be able to reference a table with a schema set", function () {
            const self = this;

            const UserPub = this.sequelize.define("UserPub", {
                username: type.STRING
            }, { schema: "prefix" });

            const ItemPub = this.sequelize.define("ItemPub", {
                name: type.STRING
            }, { schema: "prefix" });

            UserPub.hasMany(ItemPub, {
                foreignKeyConstraint: true
            });

            const run = function () {
                return UserPub.sync({ force: true }).then(() => {
                    return ItemPub.sync({
                        force: true, logging: _.after(2, _.once((sql) => {
                            if (dialect === "postgres") {
                                expect(sql).to.match(/REFERENCES\s+"prefix"\."UserPubs" \("id"\)/);
                            } else if (dialect === "mssql") {
                                expect(sql).to.match(/REFERENCES\s+\[prefix\]\.\[UserPubs\] \(\[id\]\)/);
                            } else {
                                expect(sql).to.match(/REFERENCES\s+`prefix\.UserPubs` \(`id`\)/);
                            }

                        }))
                    });
                });
            };

            if (dialect === "postgres") {
                return this.sequelize.queryInterface.dropAllSchemas().then(() => {
                    return self.sequelize.queryInterface.createSchema("prefix").then(() => {
                        return run.call(self);
                    });
                });
            }
            return run.call(self);

        });

        it("should be able to create and update records under any valid schematic", function () {
            const self = this;
            let logged = 0;
            return self.UserPublic.sync({ force: true }).then((UserPublicSync) => {
                return UserPublicSync.create({ age: 3 }, {
                    logging(UserPublic) {
                        logged++;
                        if (dialect === "postgres") {
                            expect(self.UserSpecialSync.getTableName().toString()).to.equal('"special"."UserSpecials"');
                            expect(UserPublic.indexOf('INSERT INTO "UserPublics"')).to.be.above(-1);
                        } else if (dialect === "sqlite") {
                            expect(self.UserSpecialSync.getTableName().toString()).to.equal("`special.UserSpecials`");
                            expect(UserPublic.indexOf("INSERT INTO `UserPublics`")).to.be.above(-1);
                        } else if (dialect === "mssql") {
                            expect(self.UserSpecialSync.getTableName().toString()).to.equal("[special].[UserSpecials]");
                            expect(UserPublic.indexOf("INSERT INTO [UserPublics]")).to.be.above(-1);
                        } else {
                            expect(self.UserSpecialSync.getTableName().toString()).to.equal("`special.UserSpecials`");
                            expect(UserPublic.indexOf("INSERT INTO `UserPublics`")).to.be.above(-1);
                        }
                    }
                }).then(() => {
                    return self.UserSpecialSync.schema("special").create({ age: 3 }, {
                        logging(UserSpecial) {
                            logged++;
                            if (dialect === "postgres") {
                                expect(UserSpecial.indexOf('INSERT INTO "special"."UserSpecials"')).to.be.above(-1);
                            } else if (dialect === "sqlite") {
                                expect(UserSpecial.indexOf("INSERT INTO `special.UserSpecials`")).to.be.above(-1);
                            } else if (dialect === "mssql") {
                                expect(UserSpecial.indexOf("INSERT INTO [special].[UserSpecials]")).to.be.above(-1);
                            } else {
                                expect(UserSpecial.indexOf("INSERT INTO `special.UserSpecials`")).to.be.above(-1);
                            }
                        }
                    }).then((UserSpecial) => {
                        return UserSpecial.updateAttributes({ age: 5 }, {
                            logging(user) {
                                logged++;
                                if (dialect === "postgres") {
                                    expect(user.indexOf('UPDATE "special"."UserSpecials"')).to.be.above(-1);
                                } else if (dialect === "mssql") {
                                    expect(user.indexOf("UPDATE [special].[UserSpecials]")).to.be.above(-1);
                                } else {
                                    expect(user.indexOf("UPDATE `special.UserSpecials`")).to.be.above(-1);
                                }
                            }
                        });
                    });
                }).then(() => {
                    expect(logged).to.equal(3);
                });
            });
        });
    });

    describe("references", () => {
        beforeEach(function () {
            const self = this;

            this.Author = this.sequelize.define("author", { firstName: type.STRING });

            return this.sequelize.getQueryInterface().dropTable("posts", { force: true }).then(() => {
                return self.sequelize.getQueryInterface().dropTable("authors", { force: true });
            }).then(() => {
                return self.Author.sync();
            });
        });

        it("uses an existing dao factory and references the author table", function () {
            const authorIdColumn = { type: type.INTEGER, references: { model: this.Author, key: "id" } };

            const Post = this.sequelize.define("post", {
                title: type.STRING,
                authorId: authorIdColumn
            });

            this.Author.hasMany(Post);
            Post.belongsTo(this.Author);

            // The posts table gets dropped in the before filter.
            return Post.sync({
                logging: _.once((sql) => {
                    if (dialect === "postgres") {
                        expect(sql).to.match(/"authorId" INTEGER REFERENCES "authors" \("id"\)/);
                    } else if (dialect === "mysql") {
                        expect(sql).to.match(/FOREIGN KEY \(`authorId`\) REFERENCES `authors` \(`id`\)/);
                    } else if (dialect === "mssql") {
                        expect(sql).to.match(/FOREIGN KEY \(\[authorId\]\) REFERENCES \[authors\] \(\[id\]\)/);
                    } else if (dialect === "sqlite") {
                        expect(sql).to.match(/`authorId` INTEGER REFERENCES `authors` \(`id`\)/);
                    } else {
                        throw new Error("Undefined dialect!");
                    }
                })
            });
        });

        it("uses a table name as a string and references the author table", function () {
            const authorIdColumn = { type: type.INTEGER, references: { model: "authors", key: "id" } };

            const self = this,
                Post = self.sequelize.define("post", { title: type.STRING, authorId: authorIdColumn });

            this.Author.hasMany(Post);
            Post.belongsTo(this.Author);

            // The posts table gets dropped in the before filter.
            return Post.sync({
                logging: _.once((sql) => {
                    if (dialect === "postgres") {
                        expect(sql).to.match(/"authorId" INTEGER REFERENCES "authors" \("id"\)/);
                    } else if (dialect === "mysql") {
                        expect(sql).to.match(/FOREIGN KEY \(`authorId`\) REFERENCES `authors` \(`id`\)/);
                    } else if (dialect === "sqlite") {
                        expect(sql).to.match(/`authorId` INTEGER REFERENCES `authors` \(`id`\)/);
                    } else if (dialect === "mssql") {
                        expect(sql).to.match(/FOREIGN KEY \(\[authorId\]\) REFERENCES \[authors\] \(\[id\]\)/);
                    } else {
                        throw new Error("Undefined dialect!");
                    }
                })
            });
        });

        it("emits an error event as the referenced table name is invalid", function () {
            const authorIdColumn = { type: type.INTEGER, references: { model: "4uth0r5", key: "id" } };

            const Post = this.sequelize.define("post", { title: type.STRING, authorId: authorIdColumn });

            this.Author.hasMany(Post);
            Post.belongsTo(this.Author);

            // The posts table gets dropped in the before filter.
            return Post.sync().then(() => {
                if (dialect === "sqlite") {
                    // sorry ... but sqlite is too stupid to understand whats going on ...
                    expect(1).to.equal(1);
                } else {
                    // the parser should not end up here ...
                    expect(2).to.equal(1);
                }


            }).catch((err) => {
                if (dialect === "mysql") {
                    // MySQL 5.7 or above doesn't support POINT EMPTY
                    if (dialect === "mysql" && adone.semver.gte(current.options.databaseVersion, "5.6.0")) {
                        expect(err.message).to.match(/Cannot add foreign key constraint/);
                    } else {
                        expect(err.message).to.match(/Can\'t create table/);
                    }
                } else if (dialect === "sqlite") {
                    // the parser should not end up here ... see above
                    expect(1).to.equal(2);
                } else if (dialect === "postgres") {
                    expect(err.message).to.match(/relation "4uth0r5" does not exist/);
                } else if (dialect === "mssql") {
                    expect(err.message).to.match(/Could not create constraint/);
                } else {
                    throw new Error("Undefined dialect!");
                }
            });
        });

        it("works with comments", function () {
            // Test for a case where the comment was being moved to the end of the table when there was also a reference on the column, see #1521
            const Member = this.sequelize.define("Member", {});
            const idColumn = {
                type: type.INTEGER,
                primaryKey: true,
                autoIncrement: false,
                comment: "asdf"
            };

            idColumn.references = { model: Member, key: "id" };

            this.sequelize.define("Profile", { id: idColumn });

            return this.sequelize.sync({ force: true });
        });
    });

    describe("blob", () => {
        beforeEach(function () {
            this.BlobUser = this.sequelize.define("blobUser", {
                data: type.BLOB
            });

            return this.BlobUser.sync({ force: true });
        });

        describe("buffers", () => {
            it("should be able to take a buffer as parameter to a BLOB field", function () {
                return this.BlobUser.create({
                    data: new Buffer("Sequelize")
                }).then((user) => {
                    expect(user).to.be.ok;
                });
            });

            it("should return a buffer when fetching a blob", function () {
                const self = this;
                return this.BlobUser.create({
                    data: new Buffer("Sequelize")
                }).then((user) => {
                    return self.BlobUser.findById(user.id).then((user) => {
                        expect(user.data).to.be.an.instanceOf(Buffer);
                        expect(user.data.toString()).to.have.string("Sequelize");
                    });
                });
            });

            it("should work when the database returns null", function () {
                const self = this;
                return this.BlobUser.create({
                    // create a null column
                }).then((user) => {
                    return self.BlobUser.findById(user.id).then((user) => {
                        expect(user.data).to.be.null;
                    });
                });
            });
        });

        if (dialect !== "mssql") {
            // NOTE: someone remember to inform me about the intent of these tests. Are
            //       you saying that data passed in as a string is automatically converted
            //       to binary? i.e. "Sequelize" is CAST as binary, OR that actual binary
            //       data is passed in, in string form? Very unclear, and very different.

            describe("strings", () => {
                it("should be able to take a string as parameter to a BLOB field", function () {
                    return this.BlobUser.create({
                        data: "Sequelize"
                    }).then((user) => {
                        expect(user).to.be.ok;
                    });
                });

                it("should return a buffer when fetching a BLOB, even when the BLOB was inserted as a string", function () {
                    const self = this;
                    return this.BlobUser.create({
                        data: "Sequelize"
                    }).then((user) => {
                        return self.BlobUser.findById(user.id).then((user) => {
                            expect(user.data).to.be.an.instanceOf(Buffer);
                            expect(user.data.toString()).to.have.string("Sequelize");
                        });
                    });
                });
            });
        }

    });

    describe("paranoid is true and where is an array", () => {

        beforeEach(function () {
            this.User = this.sequelize.define("User", { username: type.STRING }, { paranoid: true });
            this.Project = this.sequelize.define("Project", { title: type.STRING }, { paranoid: true });

            this.Project.belongsToMany(this.User, { through: "project_user" });
            this.User.belongsToMany(this.Project, { through: "project_user" });

            const self = this;
            return this.sequelize.sync({ force: true }).then(() => {
                return self.User.bulkCreate([{
                    username: "leia"
                }, {
                    username: "luke"
                }, {
                    username: "vader"
                }]).then(() => {
                    return self.Project.bulkCreate([{
                        title: "republic"
                    }, {
                        title: "empire"
                    }]).then(() => {
                        return self.User.findAll().then((users) => {
                            return self.Project.findAll().then((projects) => {
                                const leia = users[0],
                                    luke = users[1],
                                    vader = users[2],
                                    republic = projects[0],
                                    empire = projects[1];
                                return leia.setProjects([republic]).then(() => {
                                    return luke.setProjects([republic]).then(() => {
                                        return vader.setProjects([empire]).then(() => {
                                            return leia.destroy();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        it("should not fail when array contains Sequelize.or / and", function () {
            return this.User.findAll({
                where: [
                    this.sequelize.or({ username: "vader" }, { username: "luke" }),
                    this.sequelize.and({ id: [1, 2, 3] })
                ]
            })
                .then((res) => {
                    expect(res).to.have.length(2);
                });
        });

        it("should fail when array contains strings", async function () {
            await assert.throws(async () => {
                await this.User.findAll({
                    where: ["this is a mistake", ["dont do it!"]]
                });
            }, "Support for literal replacements in the `where` object has been removed.");
        });

        it("should not fail with an include", function () {
            return this.User.findAll({
                where: this.sequelize.literal(`${this.sequelize.queryInterface.QueryGenerator.quoteIdentifiers("Projects.title")} = ${this.sequelize.queryInterface.QueryGenerator.escape("republic")}`),
                include: [
                    { model: this.Project }
                ]
            }).then((users) => {
                expect(users.length).to.be.equal(1);
                expect(users[0].username).to.be.equal("luke");
            });
        });

        it("should not overwrite a specified deletedAt by setting paranoid: false", function () {
            let tableName = "";
            if (this.User.name) {
                tableName = `${this.sequelize.queryInterface.QueryGenerator.quoteIdentifier(this.User.name)}.`;
            }
            return this.User.findAll({
                paranoid: false,
                where: this.sequelize.literal(`${tableName + this.sequelize.queryInterface.QueryGenerator.quoteIdentifier("deletedAt")} IS NOT NULL `),
                include: [
                    { model: this.Project }
                ]
            }).then((users) => {
                expect(users.length).to.be.equal(1);
                expect(users[0].username).to.be.equal("leia");
            });
        });

        it("should not overwrite a specified deletedAt (complex query) by setting paranoid: false", function () {
            return this.User.findAll({
                paranoid: false,
                where: [
                    this.sequelize.or({ username: "leia" }, { username: "luke" }),
                    this.sequelize.and(
                        { id: [1, 2, 3] },
                        this.sequelize.or({ deletedAt: null }, { deletedAt: { gt: new Date(0) } })
                    )
                ]
            })
                .then((res) => {
                    expect(res).to.have.length(2);
                });
        });

    });

    if (dialect !== "sqlite" && current.dialect.supports.transactions) {
        it("supports multiple async transactions", async function () {
            this.timeout(90000);
            const sequelize = await Support.prepareTransactionTest(this.sequelize);
            const User = sequelize.define("User", { username: type.STRING });
            const testAsync = async (i) => {
                const t = await sequelize.transaction();
                await User.create({
                    username: "foo"
                }, {
                    transaction: t
                });
                expect(await User.findAll({
                    where: {
                        username: "foo"
                    }
                })).to.have.length(0);
                expect(await User.findAll({
                    where: {
                        username: "foo"
                    },
                    transaction: t
                })).to.have.length(1);
                await t.rollback();
            };
            await User.sync({ force: true });
            const cc = adone.util.throttle(testAsync, {
                max: (sequelize.config.pool && sequelize.config.pool.max || 5) - 1
            });
            await Promise.all(adone.util.range(1000).map(cc));
        });
    }

    describe("Unique", () => {
        it("should set unique when unique is true", function () {
            const self = this;
            const uniqueTrue = self.sequelize.define("uniqueTrue", {
                str: { type: type.STRING, unique: true }
            });

            return uniqueTrue.sync({
                force: true, logging: _.after(2, _.once((s) => {
                    expect(s).to.match(/UNIQUE/);
                }))
            });
        });

        it("should not set unique when unique is false", function () {
            const self = this;
            const uniqueFalse = self.sequelize.define("uniqueFalse", {
                str: { type: type.STRING, unique: false }
            });

            return uniqueFalse.sync({
                force: true, logging: _.after(2, _.once((s) => {
                    expect(s).not.to.match(/UNIQUE/);
                }))
            });
        });

        it("should not set unique when unique is unset", function () {
            const self = this;
            const uniqueUnset = self.sequelize.define("uniqueUnset", {
                str: { type: type.STRING }
            });

            return uniqueUnset.sync({
                force: true, logging: _.after(2, _.once((s) => {
                    expect(s).not.to.match(/UNIQUE/);
                }))
            });
        });
    });

    it("should be possible to use a key named UUID as foreign key", function () {
        this.sequelize.define("project", {
            UserId: {
                type: type.STRING,
                references: {
                    model: "Users",
                    key: "UUID"
                }
            }
        });

        this.sequelize.define("Users", {
            UUID: {
                type: type.STRING,
                primaryKey: true,
                unique: true,
                allowNull: false,
                validate: {
                    notNull: true,
                    notEmpty: true
                }
            }
        });

        return this.sequelize.sync({ force: true });
    });

    describe("bulkCreate errors", () => {
        it("should return array of errors if validate and individualHooks are true", async function () {
            const data = [{ username: null },
                { username: null },
                { username: null }];

            const user = this.sequelize.define("Users", {
                username: {
                    type: type.STRING,
                    allowNull: false,
                    validate: {
                        notNull: true,
                        notEmpty: true
                    }
                }
            });

            await assert.throws(async () => {
                await user.bulkCreate(data, {
                    validate: true,
                    individualHooks: true
                }, "AggregateException");
            });
        });
    });

    describe("increment", () => {
        beforeEach(function () {
            this.User = this.sequelize.define("User", {
                id: { type: type.INTEGER, primaryKey: true },
                aNumber: { type: type.INTEGER },
                bNumber: { type: type.INTEGER },
                cNumber: { type: type.INTEGER, field: "c_number" }
            });

            const self = this;
            return this.User.sync({ force: true }).then(() => {
                return self.User.bulkCreate([{
                    id: 1,
                    aNumber: 0,
                    bNumber: 0
                }, {
                    id: 2,
                    aNumber: 0,
                    bNumber: 0
                }, {
                    id: 3,
                    aNumber: 0,
                    bNumber: 0
                }, {
                    id: 4,
                    aNumber: 0,
                    bNumber: 0,
                    cNumber: 0
                }]);
            });
        });

        it("supports where conditions", function () {
            const self = this;
            return this.User.findById(1).then(() => {
                return self.User.increment(["aNumber"], { by: 2, where: { id: 1 } }).then(() => {
                    return self.User.findById(2).then((user3) => {
                        expect(user3.aNumber).to.be.equal(0);
                    });
                });
            });
        });

        it("uses correct column names for where conditions", function () {
            const self = this;
            return this.User.increment(["aNumber"], { by: 2, where: { cNumber: 0 } }).then(() => {
                return self.User.findById(4).then((user4) => {
                    expect(user4.aNumber).to.be.equal(2);
                });
            });
        });

        it("should still work right with other concurrent increments", function () {
            const self = this;
            return this.User.findAll().then((aUsers) => {
                return Promise.all([
                    self.User.increment(["aNumber"], { by: 2, where: {} }),
                    self.User.increment(["aNumber"], { by: 2, where: {} }),
                    self.User.increment(["aNumber"], { by: 2, where: {} })
                ]).then(() => {
                    return self.User.findAll().then((bUsers) => {
                        for (let i = 0; i < bUsers.length; i++) {
                            expect(bUsers[i].aNumber).to.equal(aUsers[i].aNumber + 6);
                        }
                    });
                });
            });
        });

        it("with array", function () {
            const self = this;
            return this.User.findAll().then((aUsers) => {
                return self.User.increment(["aNumber"], { by: 2, where: {} }).then(() => {
                    return self.User.findAll().then((bUsers) => {
                        for (let i = 0; i < bUsers.length; i++) {
                            expect(bUsers[i].aNumber).to.equal(aUsers[i].aNumber + 2);
                        }
                    });
                });
            });
        });

        it("with single field", function () {
            const self = this;
            return this.User.findAll().then((aUsers) => {
                return self.User.increment("aNumber", { by: 2, where: {} }).then(() => {
                    return self.User.findAll().then((bUsers) => {
                        for (let i = 0; i < bUsers.length; i++) {
                            expect(bUsers[i].aNumber).to.equal(aUsers[i].aNumber + 2);
                        }
                    });
                });
            });
        });

        it("with single field and no value", function () {
            const self = this;
            return this.User.findAll().then((aUsers) => {
                return self.User.increment("aNumber", { where: {} }).then(() => {
                    return self.User.findAll().then((bUsers) => {
                        for (let i = 0; i < bUsers.length; i++) {
                            expect(bUsers[i].aNumber).to.equal(aUsers[i].aNumber + 1);
                        }
                    });
                });
            });
        });

        it("with key value pair", function () {
            const self = this;
            return this.User.findAll().then((aUsers) => {
                return self.User.increment({ aNumber: 1, bNumber: 2 }, { where: {} }).then(() => {
                    return self.User.findAll().then((bUsers) => {
                        for (let i = 0; i < bUsers.length; i++) {
                            expect(bUsers[i].aNumber).to.equal(aUsers[i].aNumber + 1);
                            expect(bUsers[i].bNumber).to.equal(aUsers[i].bNumber + 2);
                        }
                    });
                });
            });
        });

        it("should still work right with other concurrent updates", function () {
            const self = this;
            return this.User.findAll().then((aUsers) => {
                return self.User.update({ aNumber: 2 }, { where: {} }).then(() => {
                    return self.User.increment(["aNumber"], { by: 2, where: {} }).then(() => {
                        return self.User.findAll().then((bUsers) => {
                            for (let i = 0; i < bUsers.length; i++) {
                                expect(bUsers[i].aNumber).to.equal(aUsers[i].aNumber + 4);
                            }
                        });
                    });
                });
            });
        });

        it("with timestamps set to true", async function () {
            const User = this.sequelize.define("IncrementUser", {
                aNumber: type.INTEGER
            }, { timestamps: true });

            await User.sync({ force: true });
            const user = await User.create({ aNumber: 1 });
            const oldDate = user.updatedAt;
            this.clock.tick(1000);
            await User.increment("aNumber", { by: 1, where: {} });
            const user2 = await User.findById(1);
            expect(user2.updatedAt).to.be.a("Date");
            expect(user2.updatedAt.getTime()).to.be.greaterThan(oldDate.getTime());
        });

        it("with timestamps set to true and options.silent set to true", async function () {
            const User = this.sequelize.define("IncrementUser", {
                aNumber: type.INTEGER
            }, { timestamps: true });

            await User.sync({ force: true });
            const user = await User.create({ aNumber: 1 });
            const oldDate = user.updatedAt;
            this.clock.tick(1000);
            await User.increment("aNumber", { by: 1, silent: true, where: {} });
            const user2 = await User.findById(1);
            expect(user2.updatedAt).to.be.a("Date");
            expect(user2.updatedAt.getTime()).to.be.equal(oldDate.getTime());
        });

        it("should work with scopes", function () {
            const User = this.sequelize.define("User", {
                aNumber: type.INTEGER,
                name: type.STRING
            }, {
                scopes: {
                    jeff: {
                        where: {
                            name: "Jeff"
                        }
                    }
                }
            });

            return User.sync({ force: true }).then(() => {
                return User.bulkCreate([
                    {
                        aNumber: 1,
                        name: "Jeff"
                    },
                    {
                        aNumber: 3,
                        name: "Not Jeff"
                    }
                ]);
            }).then(() => {
                return User.scope("jeff").increment("aNumber", {
                });
            }).then(() => {
                return User.scope("jeff").findOne();
            }).then((jeff) => {
                expect(jeff.aNumber).to.equal(2);
            }).then(() => {
                return User.findOne({
                    where: {
                        name: "Not Jeff"
                    }
                });
            }).then((notJeff) => {
                expect(notJeff.aNumber).to.equal(3);
            });
        });
    });
});
