describe("update", function () {
    const { orm } = adone;
    const { type } = orm;
    const current = this.sequelize;
    const config = this.config;

    before(function () {
        this.clock = fakeClock.install();
    });
    after(function () {
        this.clock.uninstall();
    });

    beforeEach(function () {
        this.User = this.sequelize.define("User", {
            username: { type: type.STRING },
            uuidv1: { type: type.UUID, defaultValue: type.UUIDV1 },
            uuidv4: { type: type.UUID, defaultValue: type.UUIDV4 },
            touchedAt: { type: type.DATE, defaultValue: type.NOW },
            aNumber: { type: type.INTEGER },
            bNumber: { type: type.INTEGER },
            aDate: { type: type.DATE },

            validateTest: {
                type: type.INTEGER,
                allowNull: true,
                validate: { isInt: true }
            },
            validateCustom: {
                type: type.STRING,
                allowNull: true,
                validate: { len: { msg: "Length failed.", args: [1, 20] } }
            },
            validateSideEffect: {
                type: type.VIRTUAL,
                allowNull: true,
                validate: { isInt: true },
                set(val) {
                    this.setDataValue("validateSideEffect", val);
                    this.setDataValue("validateSideAffected", val * 2);
                }
            },
            validateSideAffected: {
                type: type.INTEGER,
                allowNull: true,
                validate: { isInt: true }
            },

            dateAllowNullTrue: {
                type: type.DATE,
                allowNull: true
            }
        });
        return this.User.sync({ force: true });
    });

    if (current.dialect.supports.transactions) {
        it("supports transactions", async function () {
            const sequelize = await this.prepareTransactionTest(this.sequelize);
            const User = sequelize.define("User", { username: type.STRING });

            await User.sync({ force: true });
            const user = await User.create({ username: "foo" });
            const t = await sequelize.transaction();
            await user.update({ username: "bar" }, { transaction: t });
            const users1 = await User.findAll();
            const users2 = await User.findAll({ transaction: t });
            expect(users1[0].username).to.equal("foo");
            expect(users2[0].username).to.equal("bar");
            await t.rollback();
        });
    }

    it("should update fields that are not specified on create", function () {
        const User = this.sequelize.define(`User${config.rand()}`, {
            name: type.STRING,
            bio: type.TEXT,
            email: type.STRING
        });

        return User.sync({ force: true }).then(() => {
            return User.create({
                name: "snafu",
                email: "email"
            }, {
                fields: ["name", "email"]
            }).then((user) => {
                return user.update({ bio: "swag" });
            }).then((user) => {
                return user.reload();
            }).then((user) => {
                expect(user.get("name")).to.equal("snafu");
                expect(user.get("email")).to.equal("email");
                expect(user.get("bio")).to.equal("swag");
            });
        });
    });

    it("should succeed in updating when values are unchanged (without timestamps)", function () {
        const User = this.sequelize.define(`User${config.rand()}`, {
            name: type.STRING,
            bio: type.TEXT,
            email: type.STRING
        }, {
            timestamps: false
        });

        return User.sync({ force: true }).then(() => {
            return User.create({
                name: "snafu",
                email: "email"
            }, {
                fields: ["name", "email"]
            }).then((user) => {
                return user.update({
                    name: "snafu",
                    email: "email"
                });
            }).then((user) => {
                return user.reload();
            }).then((user) => {
                expect(user.get("name")).to.equal("snafu");
                expect(user.get("email")).to.equal("email");
            });
        });
    });

    it("should update timestamps with milliseconds", function () {
        const User = this.sequelize.define(`User${config.rand()}`, {
            name: type.STRING,
            bio: type.TEXT,
            email: type.STRING,
            createdAt: { type: new type.DATE(6), allowNull: false },
            updatedAt: { type: new type.DATE(6), allowNull: false }
        }, {
            timestamps: true
        });

        this.clock.tick(2100); //move the clock forward 2100 ms.

        return User.sync({ force: true }).then(() => {
            return User.create({
                name: "snafu",
                email: "email"
            }).then((user) => {
                return user.reload();
            }).then((user) => {
                expect(user.get("name")).to.equal("snafu");
                expect(user.get("email")).to.equal("email");
                const testDate = new Date();
                testDate.setTime(2100);
                expect(user.get("createdAt")).to.be.deep.equal(testDate);
            });
        });
    });

    it("should only save passed attributes", function () {
        const user = this.User.build();
        return user.save().then(() => {
            user.set("validateTest", 5);
            expect(user.changed("validateTest")).to.be.ok();
            return user.update({
                validateCustom: "1"
            });
        }).then(() => {
            expect(user.changed("validateTest")).to.be.ok();
            expect(user.validateTest).to.be.equal(5);
        }).then(() => {
            return user.reload();
        }).then(() => {
            expect(user.validateTest).to.not.be.equal(5);
        });
    });

    it("should save attributes affected by setters", function () {
        const user = this.User.build();
        return user.update({ validateSideEffect: 5 }).then(() => {
            expect(user.validateSideEffect).to.be.equal(5);
        }).then(() => {
            return user.reload();
        }).then(() => {
            expect(user.validateSideAffected).to.be.equal(10);
            expect(user.validateSideEffect).not.to.be.ok();
        });
    });

    describe("hooks", () => {
        it("should update attributes added in hooks when default fields are used", function () {
            const User = this.sequelize.define(`User${config.rand()}`, {
                name: type.STRING,
                bio: type.TEXT,
                email: type.STRING
            });

            User.beforeUpdate((instance) => {
                instance.set("email", "B");
            });

            return User.sync({ force: true }).then(() => {
                return User.create({
                    name: "A",
                    bio: "A",
                    email: "A"
                }).then((user) => {
                    return user.update({
                        name: "B",
                        bio: "B"
                    });
                }).then(() => {
                    return User.findOne({});
                }).then((user) => {
                    expect(user.get("name")).to.equal("B");
                    expect(user.get("bio")).to.equal("B");
                    expect(user.get("email")).to.equal("B");
                });
            });
        });

        it("should update attributes changed in hooks when default fields are used", function () {
            const User = this.sequelize.define(`User${config.rand()}`, {
                name: type.STRING,
                bio: type.TEXT,
                email: type.STRING
            });

            User.beforeUpdate((instance) => {
                instance.set("email", "C");
            });

            return User.sync({ force: true }).then(() => {
                return User.create({
                    name: "A",
                    bio: "A",
                    email: "A"
                }).then((user) => {
                    return user.update({
                        name: "B",
                        bio: "B",
                        email: "B"
                    });
                }).then(() => {
                    return User.findOne({});
                }).then((user) => {
                    expect(user.get("name")).to.equal("B");
                    expect(user.get("bio")).to.equal("B");
                    expect(user.get("email")).to.equal("C");
                });
            });
        });

        it("should validate attributes added in hooks when default fields are used", async function () {
            const User = this.sequelize.define(`User${config.rand()}`, {
                name: type.STRING,
                bio: type.TEXT,
                email: {
                    type: type.STRING,
                    validate: {
                        isEmail: true
                    }
                }
            });

            User.beforeUpdate((instance) => {
                instance.set("email", "B");
            });

            await User.sync({ force: true });
            const user = await User.create({
                name: "A",
                bio: "A",
                email: "valid.email@gmail.com"
            });
            await assert.throws(async () => {
                await user.update({
                    name: "B"
                });
            }, orm.exception.ValidationError);

            const user2 = await User.findOne({});
            expect(user2.get("email")).to.equal("valid.email@gmail.com");
        });

        it("should validate attributes changed in hooks when default fields are used", async function () {
            const User = this.sequelize.define(`User${config.rand()}`, {
                name: type.STRING,
                bio: type.TEXT,
                email: {
                    type: type.STRING,
                    validate: {
                        isEmail: true
                    }
                }
            });

            User.beforeUpdate((instance) => {
                instance.set("email", "B");
            });

            await User.sync({ force: true });
            const user = await User.create({
                name: "A",
                bio: "A",
                email: "valid.email@gmail.com"
            });

            await assert.throws(async () => {
                await user.update({
                    name: "B",
                    email: "still.valid.email@gmail.com"
                });
            }, orm.exception.ValidationError);

            const user2 = await User.findOne({});
            expect(user2.get("email")).to.equal("valid.email@gmail.com");
        });
    });

    it("should not set attributes that are not specified by fields", function () {
        const User = this.sequelize.define(`User${config.rand()}`, {
            name: type.STRING,
            bio: type.TEXT,
            email: type.STRING
        });

        return User.sync({ force: true }).then(() => {
            return User.create({
                name: "snafu",
                email: "email"
            }).then((user) => {
                return user.update({
                    bio: "heyo",
                    email: "heho"
                }, {
                    fields: ["bio"]
                });
            }).then((user) => {
                expect(user.get("name")).to.equal("snafu");
                expect(user.get("email")).to.equal("email");
                expect(user.get("bio")).to.equal("heyo");
            });
        });
    });

    it("updates attributes in the database", function () {
        return this.User.create({ username: "user" }).then((user) => {
            expect(user.username).to.equal("user");
            return user.update({ username: "person" }).then((user) => {
                expect(user.username).to.equal("person");
            });
        });
    });

    it("ignores unknown attributes", function () {
        return this.User.create({ username: "user" }).then((user) => {
            return user.update({ username: "person", foo: "bar" }).then((user) => {
                expect(user.username).to.equal("person");
                expect(user.foo).not.to.exist();
            });
        });
    });

    it("doesn't update primary keys or timestamps", async function () {
        const User = this.sequelize.define(`User${config.rand()}`, {
            name: type.STRING,
            bio: type.TEXT,
            identifier: { type: type.STRING, primaryKey: true }
        });

        await User.sync({ force: true });
        const user = await User.create({
            name: "snafu",
            identifier: "identifier"
        });
        const oldCreatedAt = user.createdAt;
        const oldUpdatedAt = user.updatedAt;
        const oldIdentifier = user.identifier;

        this.clock.tick(1000);

        await user.update({
            name: "foobar",
            createdAt: new Date(2000, 1, 1),
            identifier: "another identifier"
        });
        expect(new Date(user.createdAt)).to.be.deep.equal(new Date(oldCreatedAt));
        expect(new Date(user.updatedAt)).not.to.be.deep.equal(new Date(oldUpdatedAt));
        expect(user.identifier).to.equal(oldIdentifier);
    });

    it("stores and restores null values", function () {
        const Download = this.sequelize.define("download", {
            startedAt: type.DATE,
            canceledAt: type.DATE,
            finishedAt: type.DATE
        });

        return Download.sync().then(() => {
            return Download.create({
                startedAt: new Date()
            }).then((download) => {
                expect(download.startedAt instanceof Date).to.be.true();
                expect(download.canceledAt).to.not.be.ok();
                expect(download.finishedAt).to.not.be.ok();

                return download.update({
                    canceledAt: new Date()
                }).then((download) => {
                    expect(download.startedAt instanceof Date).to.be.true();
                    expect(download.canceledAt instanceof Date).to.be.true();
                    expect(download.finishedAt).to.not.be.ok();

                    return Download.findAll({
                        where: { finishedAt: null }
                    }).then((downloads) => {
                        downloads.forEach((download) => {
                            expect(download.startedAt instanceof Date).to.be.true();
                            expect(download.canceledAt instanceof Date).to.be.true();
                            expect(download.finishedAt).to.not.be.ok();
                        });
                    });
                });
            });
        });
    });

    it("should support logging", function () {
        const s = spy();

        return this.User.create({}).then((user) => {
            return user.update({ username: "yolo" }, { logging: s }).then(() => {
                expect(s.called).to.be.ok();
            });
        });
    });
});
