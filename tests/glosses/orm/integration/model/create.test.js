describe("create", function () {
    const { orm, vendor: { lodash: _ } } = adone;
    const { type } = orm;
    const dialect = this.getTestDialect();
    const current = this.sequelize;

    beforeEach(async function () {
        this.sequelize = await this.prepareTransactionTest(this.sequelize);

        this.User = this.sequelize.define("User", {
            username: type.STRING,
            secretValue: type.STRING,
            data: type.STRING,
            intVal: type.INTEGER,
            theDate: type.DATE,
            aBool: type.BOOLEAN,
            uniqueName: { type: type.STRING, unique: true }
        });
        this.Account = this.sequelize.define("Account", {
            accountName: type.STRING
        });
        this.Student = this.sequelize.define("Student", {
            no: { type: type.INTEGER, primaryKey: true },
            name: { type: type.STRING, allowNull: false }
        });

        await this.sequelize.sync({ force: true });
    });

    describe("findOrCreate", () => {
        if (current.dialect.supports.transactions) {
            it("supports transactions", function () {
                const self = this;
                return this.sequelize.transaction().then((t) => {
                    return self.User.findOrCreate({
                        where: {
                            username: "Username"
                        },
                        defaults: {
                            data: "some data"
                        },
                        transaction: t
                    }).then(() => {
                        return self.User.count().then((count) => {
                            expect(count).to.equal(0);
                            return t.commit().then(() => {
                                return self.User.count().then((count) => {
                                    expect(count).to.equal(1);
                                });
                            });
                        });
                    });
                });
            });

            it("supports more than one models per transaction", function () {
                const self = this;
                return this.sequelize.transaction().then((t) => {
                    return self.User.findOrCreate({ where: { username: "Username" }, defaults: { data: "some data" }, transaction: t }).then(() => {
                        return self.Account.findOrCreate({ where: { accountName: "accountName" }, transaction: t }).then(() => {
                            return t.commit();
                        });
                    });
                });
            });
        }

        it("should error correctly when defaults contain a unique key", async function () {
            const User = this.sequelize.define("user", {
                objectId: {
                    type: type.STRING,
                    unique: true
                },
                username: {
                    type: type.STRING,
                    unique: true
                }
            });

            await User.sync({ force: true });
            await User.create({
                username: "gottlieb"
            });
            await assert.throws(async () => {
                await User.findOrCreate({
                    where: {
                        objectId: "asdasdasd"
                    },
                    defaults: {
                        username: "gottlieb"
                    }
                });
            }, orm.error.UniqueConstraintError);
        });

        it("should error correctly when defaults contain a unique key and the where clause is complex", function () {
            const User = this.sequelize.define("user", {
                objectId: {
                    type: type.STRING,
                    unique: true
                },
                username: {
                    type: type.STRING,
                    unique: true
                }
            });

            return User.sync({ force: true })
                .then(() => User.create({ username: "gottlieb" }))
                .then(() => User.findOrCreate({
                    where: {
                        $or: [{
                            objectId: "asdasdasd1"
                        }, {
                            objectId: "asdasdasd2"
                        }]
                    },
                    defaults: {
                        username: "gottlieb"
                    }
                }).catch((error) => {
                    expect(error).to.be.instanceof(orm.error.UniqueConstraintError);
                    expect(error.errors[0].path).to.be.a("string", "username");
                }));
        });

        it("should work with undefined uuid primary key in where", function () {
            const User = this.sequelize.define("User", {
                id: {
                    type: type.UUID,
                    primaryKey: true,
                    allowNull: false,
                    defaultValue: type.UUIDV4
                },
                name: {
                    type: type.STRING
                }
            });

            return User.sync({ force: true }).then(() => {
                return User.findOrCreate({
                    where: {
                        id: undefined
                    },
                    defaults: {
                        name: Math.random().toString()
                    }
                });
            });
        });

        if (["sqlite", "mssql"].indexOf(current.dialect.name) === -1) {
            it("should not deadlock with no existing entries and no outer transaction", async function () {
                const User = this.sequelize.define("User", {
                    email: {
                        type: type.STRING,
                        unique: "company_user_email"
                    },
                    companyId: {
                        type: type.INTEGER,
                        unique: "company_user_email"
                    }
                });

                await User.sync({ force: true });
                await Promise.all(_.range(50).map((i) => {
                    return User.findOrCreate({
                        where: {
                            email: `unique.email.${i}@sequelizejs.com`,
                            companyId: Math.floor(Math.random() * 5)
                        }
                    });
                }));
            });

            it("should not deadlock with existing entries and no outer transaction", async function () {
                const User = this.sequelize.define("User", {
                    email: {
                        type: type.STRING,
                        unique: "company_user_email"
                    },
                    companyId: {
                        type: type.INTEGER,
                        unique: "company_user_email"
                    }
                });

                await User.sync({ force: true });
                await Promise.all(_.range(50).map((i) => {
                    return User.findOrCreate({
                        where: {
                            email: `unique.email.${i}@sequelizejs.com`,
                            companyId: 2
                        }
                    });
                }));
                await Promise.all(_.range(50).map((i) => {
                    return User.findOrCreate({
                        where: {
                            email: `unique.email.${i}@sequelizejs.com`,
                            companyId: 2
                        }
                    });
                }));
            });

            it("should not deadlock with concurrency duplicate entries and no outer transaction", async function () {
                const User = this.sequelize.define("User", {
                    email: {
                        type: type.STRING,
                        unique: "company_user_email"
                    },
                    companyId: {
                        type: type.INTEGER,
                        unique: "company_user_email"
                    }
                });

                await User.sync({ force: true });
                await Promise.all(_.range(50).map(() => {
                    return User.findOrCreate({
                        where: {
                            email: "unique.email.1@sequelizejs.com",
                            companyId: 2
                        }
                    });
                }));
            });
        }

        it("should support special characters in defaults", function () {
            const User = this.sequelize.define("user", {
                objectId: {
                    type: type.INTEGER,
                    unique: true
                },
                description: {
                    type: type.TEXT
                }
            });

            return User.sync({ force: true }).then(() => {
                return User.findOrCreate({
                    where: {
                        objectId: 1
                    },
                    defaults: {
                        description: "$$ and !! and :: and ? and ^ and * and '"
                    }
                });
            });
        });

        it("should support bools in defaults", function () {
            const User = this.sequelize.define("user", {
                objectId: {
                    type: type.INTEGER,
                    unique: true
                },
                bool: type.BOOLEAN
            });

            return User.sync({ force: true }).then(() => {
                return User.findOrCreate({
                    where: {
                        objectId: 1
                    },
                    defaults: {
                        bool: false
                    }
                });
            });
        });

        it("returns instance if already existent. Single find field.", async function () {
            const self = this;
            const data = {
                username: "Username"
            };

            const user = await this.User.create(data);
            const [_user, created] = await self.User.findOrCreate({
                where: {
                    username: user.username
                }
            });
            expect(_user.id).to.equal(user.id);
            expect(_user.username).to.equal("Username");
            expect(created).to.be.false();
        });

        it("Returns instance if already existent. Multiple find fields.", async function () {
            const self = this;
            const data = {
                username: "Username",
                data: "ThisIsData"
            };

            const user = await this.User.create(data);
            const [_user, created] = await self.User.findOrCreate({ where: data });
            expect(_user.id).to.equal(user.id);
            expect(_user.username).to.equal("Username");
            expect(_user.data).to.equal("ThisIsData");
            expect(created).to.be.false();
        });

        it("does not include error catcher in response", async function () {
            const self = this;
            const data = {
                username: "Username",
                data: "ThisIsData"
            };
            {
                const [user] = await self.User.findOrCreate({
                    where: data,
                    defaults: {}
                });
                expect(user.dataValues.sequelize_caught_exception).to.be.undefined();
            }
            {
                const [user] = await self.User.findOrCreate({
                    where: data,
                    defaults: {}
                });
                expect(user.dataValues.sequelize_caught_exception).to.be.undefined();
            }
        });

        it("creates new instance with default value.", async function () {
            const data = {
                username: "Username"
            };
            const defaultValues = {
                data: "ThisIsData"
            };

            const [user, created] = await this.User.findOrCreate({ where: data, defaults: defaultValues });
            expect(user.username).to.equal("Username");
            expect(user.data).to.equal("ThisIsData");
            expect(created).to.be.true();
        });

        it("supports .or() (only using default values)", async function () {
            const [user, created] = await this.User.findOrCreate({
                where: orm.util.or({ username: "Fooobzz" }, { secretValue: "Yolo" }),
                defaults: { username: "Fooobzz", secretValue: "Yolo" }
            });
            expect(user.username).to.equal("Fooobzz");
            expect(user.secretValue).to.equal("Yolo");
            expect(created).to.be.true();
        });

        if (current.dialect.supports.transactions) {
            it("should release transaction when meeting errors", function () {
                const self = this;

                const test = function (times) {
                    if (times > 10) {
                        return true;
                    }
                    return adone.promise.timeout(self.Student.findOrCreate({
                        where: {
                            no: 1
                        }
                    }), 1000)
                        .catch((err) => {
                            if (err instanceof orm.error.ValidationError) {
                                return test(times + 1);
                            }
                            throw err;
                        });
                };

                return test(0);
            });
        }

        describe("several concurrent calls", () => {
            if (current.dialect.supports.transactions) {
                it("works with a transaction", async function () {
                    const transaction = await this.sequelize.transaction();
                    const [first, second] = await Promise.all([
                        this.User.findOrCreate({ where: { uniqueName: "winner" }, transaction }),
                        this.User.findOrCreate({ where: { uniqueName: "winner" }, transaction })
                    ]);
                    const firstInstance = first[0];
                    const firstCreated = first[1];
                    const secondInstance = second[0];
                    const secondCreated = second[1];

                    // Depending on execution order and MAGIC either the first OR the second call should return true
                    expect(firstCreated ? !secondCreated : secondCreated).to.be.ok(); // XOR

                    expect(firstInstance).to.be.ok();
                    expect(secondInstance).to.be.ok();

                    expect(firstInstance.id).to.equal(secondInstance.id);

                    await transaction.commit();
                });
            }

            (dialect !== "sqlite" && dialect !== "mssql" ? it : it.skip)("should not fail silently with concurrency higher than pool, a unique constraint and a create hook resulting in mismatched values", function () {
                const User = this.sequelize.define("user", {
                    username: {
                        type: type.STRING,
                        unique: true,
                        field: "user_name"
                    }
                });

                User.beforeCreate((instance) => {
                    instance.set("username", instance.get("username").trim());
                });

                const s = spy();

                const names = [
                    "mick ",
                    "mick ",
                    "mick ",
                    "mick ",
                    "mick ",
                    "mick ",
                    "mick "
                ];

                return User.sync({ force: true }).then(() => {
                    return Promise.all(
                        names.map((username) => {
                            return User.findOrCreate({ where: { username } }).catch((err) => {
                                s();
                                expect(err.message).to.equal("user#findOrCreate: value used for username was not equal for both the find and the create calls, 'mick ' vs 'mick'");
                            });
                        })
                    );
                }).then(() => {
                    expect(s).to.have.been.called();
                });
            });

            (dialect !== "sqlite" ? it : it.skip)("should error correctly when defaults contain a unique key without a transaction", function () {
                const User = this.sequelize.define("user", {
                    objectId: {
                        type: type.STRING,
                        unique: true
                    },
                    username: {
                        type: type.STRING,
                        unique: true
                    }
                });

                return User.sync({ force: true }).then(() => {
                    return User.create({
                        username: "gottlieb"
                    });
                }).then(() => {
                    return Promise.all([
                        User.findOrCreate({
                            where: {
                                objectId: "asdasdasd"
                            },
                            defaults: {
                                username: "gottlieb"
                            }
                        }).then(() => {
                            throw new Error("I should have ben rejected");
                        }).catch((err) => {
                            expect(err instanceof orm.error.UniqueConstraintError).to.be.ok();
                            expect(err.fields).to.be.ok();
                        }),
                        User.findOrCreate({
                            where: {
                                objectId: "asdasdasd"
                            },
                            defaults: {
                                username: "gottlieb"
                            }
                        }).then(() => {
                            throw new Error("I should have ben rejected");
                        }).catch((err) => {
                            expect(err instanceof orm.error.UniqueConstraintError).to.be.ok();
                            expect(err.fields).to.be.ok();
                        })
                    ]);
                });
            });

            // Creating two concurrent transactions and selecting / inserting from the same table throws sqlite off
            (dialect !== "sqlite" ? it : it.skip)("works without a transaction", function () {
                return Promise.all([
                    this.User.findOrCreate({ where: { uniqueName: "winner" } }),
                    this.User.findOrCreate({ where: { uniqueName: "winner" } }),
                    (first, second) => {
                        const firstInstance = first[0],
                            firstCreated = first[1],
                            secondInstance = second[0],
                            secondCreated = second[1];

                        // Depending on execution order and MAGIC either the first OR the second call should return true
                        expect(firstCreated ? !secondCreated : secondCreated).to.be.ok(); // XOR

                        expect(firstInstance).to.be.ok();
                        expect(secondInstance).to.be.ok();

                        expect(firstInstance.id).to.equal(secondInstance.id);
                    }
                ]);
            });
        });
    });

    describe("findCreateFind", () => {
        (dialect !== "sqlite" ? it : it.skip)("should work with multiple concurrent calls", async function () {
            const [first, second, third] = await Promise.all([
                this.User.findOrCreate({ where: { uniqueName: "winner" } }),
                this.User.findOrCreate({ where: { uniqueName: "winner" } }),
                this.User.findOrCreate({ where: { uniqueName: "winner" } })
            ]);
            const firstInstance = first[0];
            const firstCreated = first[1];
            const secondInstance = second[0];
            const secondCreated = second[1];
            const thirdInstance = third[0];
            const thirdCreated = third[1];

            expect([firstCreated, secondCreated, thirdCreated].filter((value) => {
                return value;
            }).length).to.equal(1);

            expect(firstInstance).to.be.ok();
            expect(secondInstance).to.be.ok();
            expect(thirdInstance).to.be.ok();

            expect(firstInstance.id).to.equal(secondInstance.id);
            expect(secondInstance.id).to.equal(thirdInstance.id);
        });
    });

    describe("create", () => {
        it("works with non-integer primary keys with a default value", function () {
            const User = this.sequelize.define("User", {
                id: {
                    primaryKey: true,
                    type: type.UUID,
                    defaultValue: type.UUIDV4
                },
                email: {
                    type: type.UUID,
                    defaultValue: type.UUIDV4
                }
            });

            return this.sequelize.sync({ force: true }).then(() => {
                return User.create({}).then((user) => {
                    expect(user).to.be.ok();
                    expect(user.id).to.be.ok();
                });
            });
        });

        it("should return an error for a unique constraint error", function () {
            const User = this.sequelize.define("User", {
                email: {
                    type: type.STRING,
                    unique: { name: "email", msg: "Email is already registered." },
                    validate: {
                        notEmpty: true,
                        isEmail: true
                    }
                }
            });

            return this.sequelize.sync({ force: true }).then(() => {
                return User.create({ email: "hello@sequelize.com" }).then(() => {
                    return User.create({ email: "hello@sequelize.com" }).then(() => {
                        assert(false);
                    }).catch((err) => {
                        expect(err).to.be.ok();
                        expect(err).to.be.an.instanceof(Error);
                    });
                });
            });
        });

        it("works without any primary key", function () {
            const Log = this.sequelize.define("log", {
                level: type.STRING
            });

            Log.removeAttribute("id");

            return this.sequelize.sync({ force: true }).then(() => {
                return Promise.all([
                    Log.create({ level: "info" }),
                    Log.bulkCreate([
                        { level: "error" },
                        { level: "debug" }
                    ])
                ]);
            }).then(() => {
                return Log.findAll();
            }).then((logs) => {
                logs.forEach((log) => {
                    expect(log.get("id")).not.to.be.ok();
                });
            });
        });

        it("should be able to set createdAt and updatedAt if using silent: true", function () {
            const User = this.sequelize.define("user", {
                name: type.STRING
            }, {
                timestamps: true
            });

            const createdAt = new Date(2012, 10, 10, 10, 10, 10);
            const updatedAt = new Date(2011, 11, 11, 11, 11, 11);

            return User.sync({ force: true }).then(() => {
                return User.create({
                    createdAt,
                    updatedAt
                }, {
                    silent: true
                }).then((user) => {
                    expect(createdAt.getTime()).to.equal(user.get("createdAt").getTime());
                    expect(updatedAt.getTime()).to.equal(user.get("updatedAt").getTime());

                    return User.findOne({
                        where: {
                            updatedAt: {
                                ne: null
                            }
                        }
                    }).then((user) => {
                        expect(createdAt.getTime()).to.equal(user.get("createdAt").getTime());
                        expect(updatedAt.getTime()).to.equal(user.get("updatedAt").getTime());
                    });
                });
            });
        });

        it("works with custom timestamps with a default value", function () {
            const User = this.sequelize.define("User", {
                username: type.STRING,
                date_of_birth: type.DATE,
                email: type.STRING,
                password: type.STRING,
                created_time: {
                    type: type.DATE,
                    allowNull: true,
                    defaultValue: type.NOW
                },
                updated_time: {
                    type: type.DATE,
                    allowNull: true,
                    defaultValue: type.NOW
                }
            }, {
                createdAt: "created_time",
                updatedAt: "updated_time",
                tableName: "users",
                underscored: true,
                freezeTableName: true,
                force: false
            });

            return this.sequelize.sync({ force: true }).then(() => {
                return User.create({}).then((user) => {
                    expect(user).to.be.ok();
                    expect(user.created_time).to.be.ok();
                    expect(user.updated_time).to.be.ok();
                    expect(user.created_time.getMilliseconds()).not.to.equal(0);
                    expect(user.updated_time.getMilliseconds()).not.to.equal(0);
                });
            });
        });

        it("works with custom timestamps and underscored", function () {
            const User = this.sequelize.define("User", {

            }, {
                createdAt: "createdAt",
                updatedAt: "updatedAt",
                underscored: true
            });

            return this.sequelize.sync({ force: true }).then(() => {
                return User.create({}).then((user) => {
                    expect(user).to.be.ok();
                    expect(user.createdAt).to.be.ok();
                    expect(user.updatedAt).to.be.ok();

                    expect(user.created_at).not.to.be.ok();
                    expect(user.updated_at).not.to.be.ok();
                });
            });
        });

        if (current.dialect.supports.transactions) {
            it("supports transactions", function () {
                const self = this;
                return this.sequelize.transaction().then((t) => {
                    return self.User.create({ username: "user" }, { transaction: t }).then(() => {
                        return self.User.count().then((count) => {
                            expect(count).to.equal(0);
                            return t.commit().then(() => {
                                return self.User.count().then((count) => {
                                    expect(count).to.equal(1);
                                });
                            });
                        });
                    });
                });
            });
        }

        if (current.dialect.supports.returnValues) {
            describe("return values", () => {
                it("should make the autoincremented values available on the returned instances", function () {
                    const User = this.sequelize.define("user", {});

                    return User.sync({ force: true }).then(() => {
                        return User.create({}, { returning: true }).then((user) => {
                            expect(user.get("id")).to.be.ok();
                            expect(user.get("id")).to.equal(1);
                        });
                    });
                });

                it("should make the autoincremented values available on the returned instances with custom fields", function () {
                    const User = this.sequelize.define("user", {
                        maId: {
                            type: type.INTEGER,
                            primaryKey: true,
                            autoIncrement: true,
                            field: "yo_id"
                        }
                    });

                    return User.sync({ force: true }).then(() => {
                        return User.create({}, { returning: true }).then((user) => {
                            expect(user.get("maId")).to.be.ok();
                            expect(user.get("maId")).to.equal(1);
                        });
                    });
                });
            });
        }

        it("is possible to use casting when creating an instance", function () {
            const self = this,
                type = dialect === "mysql" ? "signed" : "integer";
            let match = false;

            return this.User.create({
                intVal: this.sequelize.cast("1", type)
            }, {
                logging(sql) {
                    expect(sql).to.match(new RegExp(`CAST\\(N?'1' AS ${type.toUpperCase()}\\)`));
                    match = true;
                }
            }).then((user) => {
                return self.User.findById(user.id).then((user) => {
                    expect(user.intVal).to.equal(1);
                    expect(match).to.equal(true);
                });
            });
        });

        it("is possible to use casting multiple times mixed in with other utilities", function () {
            const self = this;
            let type = this.sequelize.cast(this.sequelize.cast(this.sequelize.literal("1-2"), "integer"), "integer"),
                match = false;

            if (dialect === "mysql") {
                type = this.sequelize.cast(this.sequelize.cast(this.sequelize.literal("1-2"), "unsigned"), "signed");
            }

            return this.User.create({
                intVal: type
            }, {
                logging(sql) {
                    if (dialect === "mysql") {
                        expect(sql).to.contain("CAST(CAST(1-2 AS UNSIGNED) AS SIGNED)");
                    } else {
                        expect(sql).to.contain("CAST(CAST(1-2 AS INTEGER) AS INTEGER)");
                    }
                    match = true;
                }
            }).then((user) => {
                return self.User.findById(user.id).then((user) => {
                    expect(user.intVal).to.equal(-1);
                    expect(match).to.equal(true);
                });
            });
        });

        it("is possible to just use .literal() to bypass escaping", function () {
            const self = this;

            return this.User.create({
                intVal: this.sequelize.literal(`CAST(1-2 AS ${dialect === "mysql" ? "SIGNED" : "INTEGER"})`)
            }).then((user) => {
                return self.User.findById(user.id).then((user) => {
                    expect(user.intVal).to.equal(-1);
                });
            });
        });

        it("is possible to use funtions when creating an instance", function () {
            const self = this;
            return this.User.create({
                secretValue: this.sequelize.fn("upper", "sequelize")
            }).then((user) => {
                return self.User.findById(user.id).then((user) => {
                    expect(user.secretValue).to.equal("SEQUELIZE");
                });
            });
        });

        it("should work with a non-id named uuid primary key columns", function () {
            const Monkey = this.sequelize.define("Monkey", {
                monkeyId: { type: type.UUID, primaryKey: true, defaultValue: type.UUIDV4, allowNull: false }
            });

            return this.sequelize.sync({ force: true }).then(() => {
                return Monkey.create();
            }).then((monkey) => {
                expect(monkey.get("monkeyId")).to.be.ok();
            });
        });

        it("is possible to use functions as default values", function () {
            const self = this;
            let userWithDefaults;

            if (dialect.indexOf("postgres") === 0) {
                return this.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"').then(() => {
                    userWithDefaults = self.sequelize.define("userWithDefaults", {
                        uuid: {
                            type: "UUID",
                            defaultValue: self.sequelize.fn("uuid_generate_v4")
                        }
                    });

                    return userWithDefaults.sync({ force: true }).then(() => {
                        return userWithDefaults.create({}).then((user) => {
                            // uuid validation regex taken from http://stackoverflow.com/a/13653180/800016
                            expect(user.uuid).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
                        });
                    });
                });
            } else if (dialect === "sqlite") {
                // The definition here is a bit hacky. sqlite expects () around the expression for default values, so we call a function without a name
                // to enclose the date function in (). http://www.sqlite.org/syntaxdiagrams.html#column-constraint
                userWithDefaults = self.sequelize.define("userWithDefaults", {
                    year: {
                        type: type.STRING,
                        defaultValue: self.sequelize.fn("", self.sequelize.fn("date", "now"))
                    }
                });

                return userWithDefaults.sync({ force: true }).then(() => {
                    return userWithDefaults.create({}).then((user) => {
                        return userWithDefaults.findById(user.id).then((user) => {
                            const now = new Date(),
                                pad = function (number) {
                                    if (number > 9) {
                                        return number;
                                    }
                                    return `0${number}`;
                                };

                            expect(user.year).to.equal(`${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`);
                        });
                    });
                });
            }
            // functions as default values are not supported in mysql, see http://stackoverflow.com/a/270338/800016
            return void 0;

        });

        it("casts empty arrays correctly for postgresql insert", function () {
            if (dialect !== "postgres") {
                expect("").to.equal("");
                return void 0;
            }

            const User = this.sequelize.define("UserWithArray", {
                myvals: { type: new type.ARRAY(type.INTEGER) },
                mystr: { type: new type.ARRAY(type.STRING) }
            });

            let test = false;
            return User.sync({ force: true }).then(() => {
                return User.create({ myvals: [], mystr: [] }, {
                    logging(sql) {
                        test = true;
                        expect(sql.indexOf("ARRAY[]::INTEGER[]")).to.be.above(-1);
                        expect(sql.indexOf("ARRAY[]::VARCHAR(255)[]")).to.be.above(-1);
                    }
                });
            }).then(() => {
                expect(test).to.be.true();
            });
        });

        it("casts empty array correct for postgres update", function () {
            if (dialect !== "postgres") {
                expect("").to.equal("");
                return void 0;
            }

            const User = this.sequelize.define("UserWithArray", {
                myvals: { type: new type.ARRAY(type.INTEGER) },
                mystr: { type: new type.ARRAY(type.STRING) }
            });
            let test = false;

            return User.sync({ force: true }).then(() => {
                return User.create({ myvals: [1, 2, 3, 4], mystr: ["One", "Two", "Three", "Four"] }).then((user) => {
                    user.myvals = [];
                    user.mystr = [];
                    return user.save({
                        logging(sql) {
                            test = true;
                            expect(sql.indexOf("ARRAY[]::INTEGER[]")).to.be.above(-1);
                            expect(sql.indexOf("ARRAY[]::VARCHAR(255)[]")).to.be.above(-1);
                        }
                    });
                });
            }).then(() => {
                expect(test).to.be.true();
            });
        });

        it("doesn't allow duplicated records with unique:true", async function () {
            const self = this;
            const User = this.sequelize.define("UserWithUniqueUsername", {
                username: { type: type.STRING, unique: true }
            });

            await User.sync({ force: true });
            await User.create({ username: "foo" });
            await assert.throws(async () => {
                await User.create({ username: "foo" });
            }, self.sequelize.UniqueConstraintError);
        });

        it("raises an error if created object breaks definition contraints", function () {
            const UserNull = this.sequelize.define("UserWithNonNullSmth", {
                username: { type: type.STRING, unique: true },
                smth: { type: type.STRING, allowNull: false }
            });

            this.sequelize.options.omitNull = false;

            return UserNull.sync({ force: true }).then(() => {
                return UserNull.create({ username: "foo2", smth: null }).catch((err) => {
                    expect(err).to.exist();

                    const smth1 = err.get("smth")[0] || {};

                    expect(smth1.path).to.equal("smth");
                    expect(smth1.type || smth1.origin).to.match(/notNull Violation/);
                });
            });
        });
        it("raises an error if created object breaks definition contraints", async function () {
            const self = this;
            const UserNull = this.sequelize.define("UserWithNonNullSmth", {
                username: { type: type.STRING, unique: true },
                smth: { type: type.STRING, allowNull: false }
            });

            this.sequelize.options.omitNull = false;

            await UserNull.sync({ force: true });
            await UserNull.create({ username: "foo", smth: "foo" });
            await assert.throws(async () => {
                await UserNull.create({ username: "foo", smth: "bar" });
            }, self.sequelize.UniqueConstraintError);
        });

        it("raises an error if saving an empty string into a column allowing null or URL", function () {
            const StringIsNullOrUrl = this.sequelize.define("StringIsNullOrUrl", {
                str: { type: type.STRING, allowNull: true, validate: { isURL: true } }
            });

            this.sequelize.options.omitNull = false;

            return StringIsNullOrUrl.sync({ force: true }).then(() => {
                return StringIsNullOrUrl.create({ str: null }).then((str1) => {
                    expect(str1.str).to.be.null();
                    return StringIsNullOrUrl.create({ str: "http://sequelizejs.org" }).then((str2) => {
                        expect(str2.str).to.equal("http://sequelizejs.org");
                        return StringIsNullOrUrl.create({ str: "" }).catch((err) => {
                            expect(err).to.exist();
                            expect(err.get("str")[0].message).to.match(/Validation isURL on str failed/);
                        });
                    });
                });
            });
        });

        it("raises an error if you mess up the datatype", function () {
            const self = this;
            expect(() => {
                self.sequelize.define("UserBadDataType", {
                    activity_date: type.DATe
                });
            }).to.throw(Error, "Unrecognized data type for field activity_date");

            expect(() => {
                self.sequelize.define("UserBadDataType", {
                    activity_date: { type: type.DATe }
                });
            }).to.throw(Error, "Unrecognized data type for field activity_date");
        });

        it("sets a 64 bit int in bigint", function () {
            const User = this.sequelize.define("UserWithBigIntFields", {
                big: type.BIGINT
            });

            return User.sync({ force: true }).then(() => {
                return User.create({ big: "9223372036854775807" }).then((user) => {
                    expect(user.big).to.be.equal("9223372036854775807");
                });
            });
        });

        it("sets auto increment fields", function () {
            const User = this.sequelize.define("UserWithAutoIncrementField", {
                userid: { type: type.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false }
            });

            return User.sync({ force: true }).then(() => {
                return User.create({}).then((user) => {
                    expect(user.userid).to.equal(1);
                    return User.create({}).then((user) => {
                        expect(user.userid).to.equal(2);
                    });
                });
            });
        });

        it("allows the usage of options as attribute", function () {
            const User = this.sequelize.define("UserWithNameAndOptions", {
                name: type.STRING,
                options: type.TEXT
            });

            const options = JSON.stringify({ foo: "bar", bar: "foo" });

            return User.sync({ force: true }).then(() => {
                return User
                    .create({ name: "John Doe", options })
                    .then((user) => {
                        expect(user.options).to.equal(options);
                    });
            });
        });

        it("allows sql logging", function () {
            const User = this.sequelize.define("UserWithUniqueNameAndNonNullSmth", {
                name: { type: type.STRING, unique: true },
                smth: { type: type.STRING, allowNull: false }
            });

            let test = false;
            return User.sync({ force: true }).then(() => {
                return User
                    .create({ name: "Fluffy Bunny", smth: "else" }, {
                        logging(sql) {
                            expect(sql).to.exist();
                            test = true;
                            expect(sql.toUpperCase().indexOf("INSERT")).to.be.above(-1);
                        }
                    });
            }).then(() => {
                expect(test).to.be.true();
            });
        });

        it("should only store the values passed in the whitelist", function () {
            const self = this,
                data = { username: "Peter", secretValue: "42" };

            return this.User.create(data, { fields: ["username"] }).then((user) => {
                return self.User.findById(user.id).then((_user) => {
                    expect(_user.username).to.equal(data.username);
                    expect(_user.secretValue).not.to.equal(data.secretValue);
                    expect(_user.secretValue).to.equal(null);
                });
            });
        });

        it("should store all values if no whitelist is specified", function () {
            const self = this,
                data = { username: "Peter", secretValue: "42" };

            return this.User.create(data).then((user) => {
                return self.User.findById(user.id).then((_user) => {
                    expect(_user.username).to.equal(data.username);
                    expect(_user.secretValue).to.equal(data.secretValue);
                });
            });
        });

        it("can omit autoincremental columns", function () {
            const self = this,
                data = { title: "Iliad" },
                dataTypes = [type.INTEGER, type.BIGINT],
                sync = [],
                promises = [],
                books = [];

            dataTypes.forEach((dataType, index) => {
                books[index] = self.sequelize.define(`Book${index}`, {
                    id: { type: dataType, primaryKey: true, autoIncrement: true },
                    title: type.TEXT
                });
            });

            books.forEach((b) => {
                sync.push(b.sync({ force: true }));
            });

            return Promise.all(sync).then(() => {
                books.forEach((b, index) => {
                    promises.push(b.create(data).then((book) => {
                        expect(book.title).to.equal(data.title);
                        expect(book.author).to.equal(data.author);
                        expect(books[index].rawAttributes.id.type instanceof dataTypes[index]).to.be.ok();
                    }));
                });
                return Promise.all(promises);
            });
        });

        it("saves data with single quote", function () {
            const quote = "single'quote",
                self = this;

            return this.User.create({ data: quote }).then((user) => {
                expect(user.data).to.equal(quote);
                return self.User.find({ where: { id: user.id } }).then((user) => {
                    expect(user.data).to.equal(quote);
                });
            });
        });

        it("saves data with double quote", function () {
            const quote = 'double"quote',
                self = this;

            return this.User.create({ data: quote }).then((user) => {
                expect(user.data).to.equal(quote);
                return self.User.find({ where: { id: user.id } }).then((user) => {
                    expect(user.data).to.equal(quote);
                });
            });
        });

        it("saves stringified JSON data", function () {
            const json = JSON.stringify({ key: "value" }),
                self = this;

            return this.User.create({ data: json }).then((user) => {
                expect(user.data).to.equal(json);
                return self.User.find({ where: { id: user.id } }).then((user) => {
                    expect(user.data).to.equal(json);
                });
            });
        });

        it("stores the current date in createdAt", function () {
            return this.User.create({ username: "foo" }).then((user) => {
                expect(parseInt(Number(user.createdAt) / 5000, 10)).to.be.closeTo(parseInt(Number(new Date()) / 5000, 10), 1.5);
            });
        });

        it("allows setting custom IDs", function () {
            const self = this;
            return this.User.create({ id: 42 }).then((user) => {
                expect(user.id).to.equal(42);
                return self.User.findById(42).then((user) => {
                    expect(user).to.exist();
                });
            });
        });

        it("should allow blank creates (with timestamps: false)", function () {
            const Worker = this.sequelize.define("Worker", {}, { timestamps: false });
            return Worker.sync().then(() => {
                return Worker.create({}, { fields: [] }).then((worker) => {
                    expect(worker).to.be.ok();
                });
            });
        });

        it("should allow truly blank creates", function () {
            const Worker = this.sequelize.define("Worker", {}, { timestamps: false });
            return Worker.sync().then(() => {
                return Worker.create({}, { fields: [] }).then((worker) => {
                    expect(worker).to.be.ok();
                });
            });
        });

        it("should only set passed fields", function () {
            const User = this.sequelize.define("User", {
                email: {
                    type: type.STRING
                },
                name: {
                    type: type.STRING
                }
            });

            return this.sequelize.sync({ force: true }).then(() => {
                return User.create({
                    name: "Yolo Bear",
                    email: "yolo@bear.com"
                }, {
                    fields: ["name"]
                }).then((user) => {
                    expect(user.name).to.be.ok();
                    expect(user.email).not.to.be.ok();
                    return User.findById(user.id).then((user) => {
                        expect(user.name).to.be.ok();
                        expect(user.email).not.to.be.ok();
                    });
                });
            });
        });

        it("Works even when SQL query has a values of transaction keywords such as BEGIN TRANSACTION", function () {
            const Task = this.sequelize.define("task", {
                title: type.STRING
            });
            return Task.sync({ force: true })
                .then(() => {
                    return Promise.all([
                        Task.create({ title: "BEGIN TRANSACTION" }),
                        Task.create({ title: "COMMIT TRANSACTION" }),
                        Task.create({ title: "ROLLBACK TRANSACTION" }),
                        Task.create({ title: "SAVE TRANSACTION" })
                    ]);
                })
                .then((newTasks) => {
                    expect(newTasks).to.have.lengthOf(4);
                    expect(newTasks[0].title).to.equal("BEGIN TRANSACTION");
                    expect(newTasks[1].title).to.equal("COMMIT TRANSACTION");
                    expect(newTasks[2].title).to.equal("ROLLBACK TRANSACTION");
                    expect(newTasks[3].title).to.equal("SAVE TRANSACTION");
                });
        });

        describe("enums", () => {
            it("correctly restores enum values", function () {
                const self = this;
                const Item = self.sequelize.define("Item", {
                    state: { type: type.ENUM, values: ["available", "in_cart", "shipped"] }
                });

                return Item.sync({ force: true }).then(() => {
                    return Item.create({ state: "available" }).then((_item) => {
                        return Item.find({ where: { state: "available" } }).then((item) => {
                            expect(item.id).to.equal(_item.id);
                        });
                    });
                });
            });

            it("allows null values", function () {
                const Enum = this.sequelize.define("Enum", {
                    state: {
                        type: type.ENUM,
                        values: ["happy", "sad"],
                        allowNull: true
                    }
                });

                return Enum.sync({ force: true }).then(() => {
                    return Enum.create({ state: null }).then((_enum) => {
                        expect(_enum.state).to.be.null();
                    });
                });
            });

            describe("when defined via { field: type.ENUM }", () => {
                it("allows values passed as parameters", function () {
                    const Enum = this.sequelize.define("Enum", {
                        state: new type.ENUM("happy", "sad")
                    });

                    return Enum.sync({ force: true }).then(() => {
                        return Enum.create({ state: "happy" });
                    });
                });

                it("allows values passed as an array", function () {
                    const Enum = this.sequelize.define("Enum", {
                        state: new type.ENUM(["happy", "sad"])
                    });

                    return Enum.sync({ force: true }).then(() => {
                        return Enum.create({ state: "happy" });
                    });
                });
            });

            describe("when defined via { field: { type: type.ENUM } }", () => {
                it("allows values passed as parameters", function () {
                    const Enum = this.sequelize.define("Enum", {
                        state: {
                            type: new type.ENUM("happy", "sad")
                        }
                    });

                    return Enum.sync({ force: true }).then(() => {
                        return Enum.create({ state: "happy" });
                    });
                });

                it("allows values passed as an array", function () {
                    const Enum = this.sequelize.define("Enum", {
                        state: {
                            type: new type.ENUM(["happy", "sad"])
                        }
                    });

                    return Enum.sync({ force: true }).then(() => {
                        return Enum.create({ state: "happy" });
                    });
                });
            });

            describe("can safely sync multiple times", () => {
                it("through the factory", function () {
                    const Enum = this.sequelize.define("Enum", {
                        state: {
                            type: type.ENUM,
                            values: ["happy", "sad"],
                            allowNull: true
                        }
                    });

                    return Enum.sync({ force: true }).then(() => {
                        return Enum.sync().then(() => {
                            return Enum.sync({ force: true });
                        });
                    });
                });

                it("through sequelize", function () {
                    const self = this;
                    this.sequelize.define("Enum", {
                        state: {
                            type: type.ENUM,
                            values: ["happy", "sad"],
                            allowNull: true
                        }
                    });

                    return this.sequelize.sync({ force: true }).then(() => {
                        return self.sequelize.sync().then(() => {
                            return self.sequelize.sync({ force: true });
                        });
                    });
                });
            });
        });
    });

    it("should return autoIncrement primary key (create)", function () {
        const Maya = this.sequelize.define("Maya", {});

        const M1 = {};

        return Maya.sync({ force: true }).then(() => Maya.create(M1, { returning: true }))
            .then((m) => {
                expect(m.id).to.be.eql(1);
            });
    });

    it("should support logging", function () {
        const s = spy();

        return this.User.create({}, {
            logging: s
        }).then(() => {
            expect(s.called).to.be.ok();
        });
    });
});
