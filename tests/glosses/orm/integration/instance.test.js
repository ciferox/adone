describe("instance", function () {
    const { is } = adone;
    const { orm } = adone;
    const { type } = orm;

    const dialect = this.getTestDialect();
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

            dateAllowNullTrue: {
                type: type.DATE,
                allowNull: true
            },

            isSuperUser: {
                type: type.BOOLEAN,
                defaultValue: false
            }
        });

        return this.User.sync({ force: true });
    });

    describe("Escaping", () => {
        it("is done properly for special characters", function () {
            // Ideally we should test more: "\0\n\r\b\t\\\'\"\x1a"
            // But this causes sqlite to fail and exits the entire test suite immediately
            const bio = `${dialect}'"\n`, // Need to add the dialect here so in case of failure I know what DB it failed for
                self = this;

            return this.User.create({ username: bio }).then((u1) => {
                return self.User.findById(u1.id).then((u2) => {
                    expect(u2.username).to.equal(bio);
                });
            });
        });
    });

    describe("isNewRecord", () => {
        it("returns true for non-saved objects", function () {
            const user = this.User.build({ username: "user" });
            expect(user.id).to.be.null();
            expect(user.isNewRecord).to.be.ok();
        });

        it("returns false for saved objects", function () {
            return this.User.build({ username: "user" }).save().then((user) => {
                expect(user.isNewRecord).to.not.be.ok();
            });
        });

        it("returns false for created objects", function () {
            return this.User.create({ username: "user" }).then((user) => {
                expect(user.isNewRecord).to.not.be.ok();
            });
        });

        it("returns false for objects found by find method", function () {
            const self = this;
            return this.User.create({ username: "user" }).then(() => {
                return self.User.create({ username: "user" }).then((user) => {
                    return self.User.findById(user.id).then((user) => {
                        expect(user.isNewRecord).to.not.be.ok();
                    });
                });
            });
        });

        it("returns false for objects found by findAll method", function () {
            const self = this,
                users = [];

            for (let i = 0; i < 10; i++) {
                users[users.length] = { username: "user" };
            }

            return this.User.bulkCreate(users).then(() => {
                return self.User.findAll().then((users) => {
                    users.forEach((u) => {
                        expect(u.isNewRecord).to.not.be.ok();
                    });
                });
            });
        });
    });

    describe("increment", () => {
        beforeEach(function () {
            return this.User.create({ id: 1, aNumber: 0, bNumber: 0 });
        });

        if (current.dialect.supports.transactions) {
            it("supports transactions", async function () {
                const sequelize = await this.prepareTransactionTest(this.sequelize);
                const User = sequelize.define("User", { number: type.INTEGER });

                await User.sync({ force: true });
                const user = await User.create({ number: 1 });
                const t = await sequelize.transaction();
                await user.increment("number", { by: 2, transaction: t });
                const users1 = await User.findAll();
                const users2 = await User.findAll({ transaction: t });
                expect(users1[0].number).to.equal(1);
                expect(users2[0].number).to.equal(3);
                await t.rollback();
            });
        }

        if (current.dialect.supports.returnValues.returning) {
            it("supports returning", async function () {
                const user1 = await this.User.findById(1);
                await user1.increment("aNumber", { by: 2 });
                expect(user1.aNumber).to.be.equal(2);
                const user3 = await user1.increment("bNumber", { by: 2, returning: false });
                expect(user3.bNumber).to.be.equal(0);
            });
        }

        it("supports where conditions", function () {
            const self = this;
            return this.User.findById(1).then((user1) => {
                return user1.increment(["aNumber"], { by: 2, where: { bNumber: 1 } }).then(() => {
                    return self.User.findById(1).then((user3) => {
                        expect(user3.aNumber).to.be.equal(0);
                    });
                });
            });
        });

        it("with array", function () {
            const self = this;
            return this.User.findById(1).then((user1) => {
                return user1.increment(["aNumber"], { by: 2 }).then(() => {
                    return self.User.findById(1).then((user3) => {
                        expect(user3.aNumber).to.be.equal(2);
                    });
                });
            });
        });

        it("with single field", function () {
            const self = this;
            return this.User.findById(1).then((user1) => {
                return user1.increment("aNumber", { by: 2 }).then(() => {
                    return self.User.findById(1).then((user3) => {
                        expect(user3.aNumber).to.be.equal(2);
                    });
                });
            });
        });

        it("with single field and no value", function () {
            const self = this;
            return this.User.findById(1).then((user1) => {
                return user1.increment("aNumber").then(() => {
                    return self.User.findById(1).then((user2) => {
                        expect(user2.aNumber).to.be.equal(1);
                    });
                });
            });
        });

        it("should still work right with other concurrent updates", function () {
            const self = this;
            return this.User.findById(1).then((user1) => {
                // Select the user again (simulating a concurrent query)
                return self.User.findById(1).then((user2) => {
                    return user2.updateAttributes({
                        aNumber: user2.aNumber + 1
                    }).then(() => {
                        return user1.increment(["aNumber"], { by: 2 }).then(() => {
                            return self.User.findById(1).then((user5) => {
                                expect(user5.aNumber).to.be.equal(3);
                            });
                        });
                    });
                });
            });
        });

        it("should still work right with other concurrent increments", function () {
            const self = this;
            return this.User.findById(1).then((user1) => {
                return Promise.all([
                    user1.increment(["aNumber"], { by: 2 }),
                    user1.increment(["aNumber"], { by: 2 }),
                    user1.increment(["aNumber"], { by: 2 })
                ]).then(() => {
                    return self.User.findById(1).then((user2) => {
                        expect(user2.aNumber).to.equal(6);
                    });
                });
            });
        });

        it("with key value pair", function () {
            const self = this;
            return this.User.findById(1).then((user1) => {
                return user1.increment({ aNumber: 1, bNumber: 2 }).then(() => {
                    return self.User.findById(1).then((user3) => {
                        expect(user3.aNumber).to.be.equal(1);
                        expect(user3.bNumber).to.be.equal(2);
                    });
                });
            });
        });

        it("with timestamps set to true", function () {
            const User = this.sequelize.define("IncrementUser", {
                aNumber: type.INTEGER
            }, { timestamps: true });

            let oldDate;

            return User.sync({ force: true })
                .then(() => User.create({ aNumber: 1 }))
                .then((user) => {
                    oldDate = user.get("updatedAt");

                    this.clock.tick(1000);
                    return user.increment("aNumber", { by: 1 });
                })
                .then((user) => user.reload())
                .then((user) => {
                    expect(user.updatedAt).to.be.a("Date");
                    expect(user.updatedAt.getTime()).to.be.greaterThan(oldDate.getTime());
                });
        });

        it("with timestamps set to true and options.silent set to true", async function () {
            const User = this.sequelize.define("IncrementUser", {
                aNumber: type.INTEGER
            }, { timestamps: true });
            let oldDate;

            await User.sync({ force: true });
            const user = await User.create({ aNumber: 1 });
            oldDate = user.updatedAt;
            this.clock.tick(1000);
            await user.increment("aNumber", { by: 1, silent: true });
            const user2 = await User.findById(1);
            expect(user2.updatedAt).to.be.a("date");
            expect(user2.updatedAt).to.be.deep.equal(oldDate);
        });
    });

    describe("decrement", () => {
        beforeEach(function () {
            return this.User.create({ id: 1, aNumber: 0, bNumber: 0 });
        });

        if (current.dialect.supports.transactions) {
            it("supports transactions", async function () {
                const sequelize = await this.prepareTransactionTest(this.sequelize);
                const User = sequelize.define("User", { number: type.INTEGER });

                await User.sync({ force: true });
                const user = await User.create({ number: 3 });
                const t = await sequelize.transaction();
                await user.decrement("number", { by: 2, transaction: t });
                const users1 = await User.findAll();
                const users2 = await User.findAll({ transaction: t });
                expect(users1[0].number).to.equal(3);
                expect(users2[0].number).to.equal(1);
                await t.rollback();
            });
        }

        if (current.dialect.supports.returnValues.returning) {
            it("supports returning", async function () {
                const user1 = await this.User.findById(1);
                await user1.decrement("aNumber", { by: 2 });
                expect(user1.aNumber).to.be.equal(-2);
                const user3 = await user1.decrement("bNumber", { by: 2, returning: false });
                expect(user3.bNumber).to.be.equal(0);
            });
        }

        it("with array", function () {
            const self = this;
            return this.User.findById(1).then((user1) => {
                return user1.decrement(["aNumber"], { by: 2 }).then(() => {
                    return self.User.findById(1).then((user3) => {
                        expect(user3.aNumber).to.be.equal(-2);
                    });
                });
            });
        });

        it("with single field", function () {
            const self = this;
            return this.User.findById(1).then((user1) => {
                return user1.decrement("aNumber", { by: 2 }).then(() => {
                    return self.User.findById(1).then((user3) => {
                        expect(user3.aNumber).to.be.equal(-2);
                    });
                });
            });
        });

        it("with single field and no value", function () {
            const self = this;
            return this.User.findById(1).then((user1) => {
                return user1.decrement("aNumber").then(() => {
                    return self.User.findById(1).then((user2) => {
                        expect(user2.aNumber).to.be.equal(-1);
                    });
                });
            });
        });

        it("should still work right with other concurrent updates", function () {
            const self = this;
            return this.User.findById(1).then((user1) => {
                // Select the user again (simulating a concurrent query)
                return self.User.findById(1).then((user2) => {
                    return user2.updateAttributes({
                        aNumber: user2.aNumber + 1
                    }).then(() => {
                        return user1.decrement(["aNumber"], { by: 2 }).then(() => {
                            return self.User.findById(1).then((user5) => {
                                expect(user5.aNumber).to.be.equal(-1);
                            });
                        });
                    });
                });
            });
        });

        it("should still work right with other concurrent increments", function () {
            const self = this;
            return this.User.findById(1).then((user1) => {
                return Promise.all([
                    user1.decrement(["aNumber"], { by: 2 }),
                    user1.decrement(["aNumber"], { by: 2 }),
                    user1.decrement(["aNumber"], { by: 2 })
                ]).then(() => {
                    return self.User.findById(1).then((user2) => {
                        expect(user2.aNumber).to.equal(-6);
                    });
                });
            });
        });

        it("with key value pair", function () {
            const self = this;
            return this.User.findById(1).then((user1) => {
                return user1.decrement({ aNumber: 1, bNumber: 2 }).then(() => {
                    return self.User.findById(1).then((user3) => {
                        expect(user3.aNumber).to.be.equal(-1);
                        expect(user3.bNumber).to.be.equal(-2);
                    });
                });
            });
        });

        it("with negative value", function () {
            const self = this;
            return this.User.findById(1).then((user1) => {
                return Promise.all([
                    user1.decrement("aNumber", { by: -2 }),
                    user1.decrement(["aNumber", "bNumber"], { by: -2 }),
                    user1.decrement({ aNumber: -1, bNumber: -2 })
                ]).then(() => {
                    return self.User.findById(1).then((user3) => {
                        expect(user3.aNumber).to.be.equal(+5);
                        expect(user3.bNumber).to.be.equal(+4);
                    });
                });
            });
        });

        it("with timestamps set to true", async function () {
            const User = this.sequelize.define("IncrementUser", {
                aNumber: type.INTEGER
            }, { timestamps: true });
            let oldDate;

            await User.sync({ force: true });
            const user = await User.create({ aNumber: 1 });
            oldDate = user.updatedAt;
            this.clock.tick(1000);
            await user.decrement("aNumber", { by: 1 });
            const user2 = await User.findById(1);
            expect(user2.updatedAt).to.be.a("date");
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
            await user.decrement("aNumber", { by: 1, silent: true });
            const user2 = await User.findById(1);
            expect(user2.updatedAt).to.be.a("date");
            expect(user2.updatedAt).to.be.deep.equal(oldDate);
        });
    });

    describe("reload", () => {
        if (current.dialect.supports.transactions) {
            it("supports transactions", async function () {
                const sequelize = await this.prepareTransactionTest(this.sequelize);
                const User = sequelize.define("User", { username: type.STRING });

                await User.sync({ force: true });
                const user = await User.create({ username: "foo" });
                const t = await sequelize.transaction();
                await User.update({ username: "bar" }, { where: { username: "foo" }, transaction: t });
                await user.reload();
                expect(user.username).to.equal("foo");
                await user.reload({ transaction: t });
                expect(user.username).to.equal("bar");
                await t.rollback();
            });
        }

        it("should return a reference to the same DAO instead of creating a new one", function () {
            return this.User.create({ username: "John Doe" }).then((originalUser) => {
                return originalUser.updateAttributes({ username: "Doe John" }).then(() => {
                    return originalUser.reload().then((updatedUser) => {
                        expect(originalUser === updatedUser).to.be.true();
                    });
                });
            });
        });

        it("should update the values on all references to the DAO", function () {
            const self = this;
            return this.User.create({ username: "John Doe" }).then((originalUser) => {
                return self.User.findById(originalUser.id).then((updater) => {
                    return updater.updateAttributes({ username: "Doe John" }).then(() => {
                        // We used a different reference when calling updateAttributes, so originalUser is now out of sync
                        expect(originalUser.username).to.equal("John Doe");
                        return originalUser.reload().then((updatedUser) => {
                            expect(originalUser.username).to.equal("Doe John");
                            expect(updatedUser.username).to.equal("Doe John");
                        });
                    });
                });
            });
        });

        it("should support updating a subset of attributes", async function () {
            const user = await this.User.create({
                aNumber: 1,
                bNumber: 1
            });
            await this.User.update({
                bNumber: 2
            }, {
                where: {
                    id: user.get("id")
                }
            });
            await user.reload({
                attributes: ["bNumber"]
            });
            expect(user.get("aNumber")).to.equal(1);
            expect(user.get("bNumber")).to.equal(2);
        });

        it("should update read only attributes as well (updatedAt)", async function () {
            const originalUser = await this.User.create({ username: "John Doe" });
            const originallyUpdatedAt = originalUser.updatedAt;
            // Wait for a second, so updatedAt will actually be different
            this.clock.tick(1000);
            const updater = await this.User.findById(originalUser.id);
            const updatedUser = await updater.updateAttributes({ username: "Doe John" });
            await originalUser.reload();
            expect(originalUser.updatedAt).to.be.above(originallyUpdatedAt);
            expect(updatedUser.updatedAt).to.be.above(originallyUpdatedAt);
        });

        it("should update the associations as well", function () {
            const Book = this.sequelize.define("Book", { title: type.STRING }),
                Page = this.sequelize.define("Page", { content: type.TEXT });

            Book.hasMany(Page);
            Page.belongsTo(Book);

            return Book.sync({ force: true }).then(() => {
                return Page.sync({ force: true }).then(() => {
                    return Book.create({ title: "A very old book" }).then((book) => {
                        return Page.create({ content: "om nom nom" }).then((page) => {
                            return book.setPages([page]).then(() => {
                                return Book.findOne({
                                    where: { id: book.id },
                                    include: [Page]
                                }).then((leBook) => {
                                    return page.updateAttributes({ content: "something totally different" }).then((page) => {
                                        expect(leBook.Pages.length).to.equal(1);
                                        expect(leBook.Pages[0].content).to.equal("om nom nom");
                                        expect(page.content).to.equal("something totally different");
                                        return leBook.reload().then((leBook) => {
                                            expect(leBook.Pages.length).to.equal(1);
                                            expect(leBook.Pages[0].content).to.equal("something totally different");
                                            expect(page.content).to.equal("something totally different");
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        it("should update internal options of the instance", function () {
            const Book = this.sequelize.define("Book", { title: type.STRING }),
                Page = this.sequelize.define("Page", { content: type.TEXT });

            Book.hasMany(Page);
            Page.belongsTo(Book);

            return Book.sync({ force: true }).then(() => {
                return Page.sync({ force: true }).then(() => {
                    return Book.create({ title: "A very old book" }).then((book) => {
                        return Page.create().then((page) => {
                            return book.setPages([page]).then(() => {
                                return Book.findOne({
                                    where: { id: book.id }
                                }).then((leBook) => {
                                    const oldOptions = leBook._options;
                                    return leBook.reload({
                                        include: [Page]
                                    }).then((leBook) => {
                                        expect(oldOptions).not.to.equal(leBook._options);
                                        expect(leBook._options.include.length).to.equal(1);
                                        expect(leBook.Pages.length).to.equal(1);
                                        expect(leBook.get({ plain: true }).Pages.length).to.equal(1);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        it("should return an error when reload fails", async function () {
            const user = await this.User.create({ username: "John Doe" });
            await user.destroy();
            await assert.throws(async () => {
                await user.reload();
            }, orm.x.InstanceError, "Instance could not be reloaded because it does not exist anymore (find call returned null)");
        });

        it("should set an association to null after deletion, 1-1", async function () {
            const Shoe = this.sequelize.define("Shoe", { brand: type.STRING });
            const Player = this.sequelize.define("Player", { name: type.STRING });

            Player.hasOne(Shoe);
            Shoe.belongsTo(Player);

            await this.sequelize.sync({ force: true });
            const shoe = await Shoe.create({
                brand: "the brand",
                Player: {
                    name: "the player"
                }
            }, { include: [Player] });
            const lePlayer = await Player.findOne({
                where: { id: shoe.Player.id },
                include: [Shoe]
            });
            expect(lePlayer.Shoe).not.to.be.null();
            await lePlayer.Shoe.destroy();
            await lePlayer.reload();
            expect(lePlayer.Shoe).to.be.null();
        });

        it("should set an association to empty after all deletion, 1-N", async function () {
            const Team = this.sequelize.define("Team", { name: type.STRING });
            const Player = this.sequelize.define("Player", { name: type.STRING });

            Team.hasMany(Player);
            Player.belongsTo(Team);

            await this.sequelize.sync({ force: true });
            const team = await Team.create({
                name: "the team",
                Players: [{
                    name: "the player1"
                }, {
                    name: "the player2"
                }]
            }, { include: [Player] });
            const leTeam = await Team.findOne({
                where: { id: team.id },
                include: [Player]
            });
            expect(leTeam.Players).not.to.be.empty();
            await leTeam.Players[1].destroy();
            await leTeam.Players[0].destroy();
            await leTeam.reload();
            expect(leTeam.Players).to.be.empty();
        });

        it("should update the associations after one element deleted", async function () {
            const Team = this.sequelize.define("Team", { name: type.STRING });
            const Player = this.sequelize.define("Player", { name: type.STRING });

            Team.hasMany(Player);
            Player.belongsTo(Team);


            await this.sequelize.sync({ force: true });
            const team = await Team.create({
                name: "the team",
                Players: [{
                    name: "the player1"
                }, {
                    name: "the player2"
                }]
            }, { include: [Player] });
            const leTeam = await Team.findOne({
                where: { id: team.id },
                include: [Player]
            });
            expect(leTeam.Players).to.have.length(2);
            await leTeam.Players[0].destroy();
            await leTeam.reload();
            expect(leTeam.Players).to.have.length(1);
        });
    });

    describe("default values", () => {
        describe("uuid", () => {
            it("should store a string in uuidv1 and uuidv4", function () {
                const user = this.User.build({ username: "a user" });
                expect(user.uuidv1).to.be.a("string");
                expect(user.uuidv4).to.be.a("string");
            });

            it("should store a string of length 36 in uuidv1 and uuidv4", function () {
                const user = this.User.build({ username: "a user" });
                expect(user.uuidv1).to.have.length(36);
                expect(user.uuidv4).to.have.length(36);
            });

            it("should store a valid uuid in uuidv1 and uuidv4 that conforms to the UUID v1 and v4 specifications", function () {
                const user = this.User.build({ username: "a user" });
                expect(is.uuid(user.uuidv1, 1)).to.be.true();
                expect(is.uuid(user.uuidv4, 4)).to.be.true();
            });

            it("should store a valid uuid if the field is a primary key named id", function () {
                const Person = this.sequelize.define("Person", {
                    id: {
                        type: type.UUID,
                        defaultValue: type.UUIDV1,
                        primaryKey: true
                    }
                });

                const person = Person.build({});
                expect(person.id).to.be.ok();
                expect(person.id).to.have.length(36);
            });
        });
        describe("current date", () => {
            it("should store a date in touchedAt", function () {
                const user = this.User.build({ username: "a user" });
                expect(user.touchedAt).to.be.instanceof(Date);
            });

            it("should store the current date in touchedAt", function () {
                const user = this.User.build({ username: "a user" });
                this.clock.tick(5000);
                expect(Number(user.touchedAt)).to.be.equal(5000);
            });
        });

        describe("allowNull date", () => {
            it('should be just "null" and not Date with Invalid Date', function () {
                const self = this;
                return this.User.build({ username: "a user" }).save().then(() => {
                    return self.User.findOne({ where: { username: "a user" } }).then((user) => {
                        expect(user.dateAllowNullTrue).to.be.null();
                    });
                });
            });

            it("should be the same valid date when saving the date", function () {
                const self = this;
                const date = new Date();
                return this.User.build({ username: "a user", dateAllowNullTrue: date }).save().then(() => {
                    return self.User.findOne({ where: { username: "a user" } }).then((user) => {
                        expect(user.dateAllowNullTrue.toString()).to.equal(date.toString());
                    });
                });
            });
        });

        describe("super user boolean", () => {
            it("should default to false", async function () {
                await this.User.build({
                    username: "a user"
                }).save();
                const user = await this.User.findOne({
                    where: {
                        username: "a user"
                    }
                });
                expect(user.isSuperUser).to.be.false();
            });

            it("should override default when given truthy boolean", async function () {
                await this.User.build({
                    username: "a user",
                    isSuperUser: true
                }).save();
                const user = await this.User.findOne({
                    where: {
                        username: "a user"
                    }
                });
                expect(user.isSuperUser).to.be.true();
            });

            it('should override default when given truthy boolean-string ("true")', async function () {
                await this.User.build({
                    username: "a user",
                    isSuperUser: "true"
                }).save();
                const user = await this.User.findOne({
                    where: {
                        username: "a user"
                    }
                });
                expect(user.isSuperUser).to.be.true();
            });

            it("should override default when given truthy boolean-int (1)", async function () {
                await this.User.build({
                    username: "a user",
                    isSuperUser: 1
                }).save();
                const user = await this.User.findOne({
                    where: {
                        username: "a user"
                    }
                });
                expect(user.isSuperUser).to.be.true();
            });

            it("should throw error when given value of incorrect type", function () {
                let callCount = 0;

                return this.User.build({
                    username: "a user",
                    isSuperUser: "INCORRECT_VALUE_TYPE"
                })
                    .save()
                    .then(() => {
                        callCount += 1;
                    })
                    .catch((err) => {
                        expect(callCount).to.equal(0);
                        expect(err).to.exist();
                        expect(err.message).to.exist();
                    });
            });
        });
    });

    describe("complete", () => {
        it("gets triggered if an error occurs", function () {
            return this.User.findOne({ where: ["asdasdasd"] }).catch((err) => {
                expect(err).to.exist();
                expect(err.message).to.exist();
            });
        });

        it("gets triggered if everything was ok", function () {
            return this.User.count().then((result) => {
                expect(result).to.exist();
            });
        });
    });

    describe("save", () => {
        if (current.dialect.supports.transactions) {
            it("supports transactions", async function () {
                const sequelize = await this.prepareTransactionTest(this.sequelize);
                const User = sequelize.define("User", { username: type.STRING });
                await User.sync({ force: true });
                const t = await sequelize.transaction();
                await User.build({ username: "foo" }).save({ transaction: t });
                const count1 = await User.count();
                const count2 = await User.count({ transaction: t });
                expect(count1).to.equal(0);
                expect(count2).to.equal(1);
                await t.rollback();
            });
        }

        it("only updates fields in passed array", function () {
            const self = this,
                date = new Date(1990, 1, 1);

            return this.User.create({
                username: "foo",
                touchedAt: new Date()
            }).then((user) => {
                user.username = "fizz";
                user.touchedAt = date;

                return user.save({ fields: ["username"] }).then(() => {
                    // re-select user
                    return self.User.findById(user.id).then((user2) => {
                        // name should have changed
                        expect(user2.username).to.equal("fizz");
                        // bio should be unchanged
                        expect(user2.birthDate).not.to.equal(date);
                    });
                });
            });
        });

        it("should work on a model with an attribute named length", function () {
            const Box = this.sequelize.define("box", {
                length: type.INTEGER,
                width: type.INTEGER,
                height: type.INTEGER
            });

            return Box.sync({ force: true }).then(() => {
                return Box.create({
                    length: 1,
                    width: 2,
                    height: 3
                }).then((box) => {
                    return box.update({
                        length: 4,
                        width: 5,
                        height: 6
                    });
                }).then(() => {
                    return Box.findOne({}).then((box) => {
                        expect(box.get("length")).to.equal(4);
                        expect(box.get("width")).to.equal(5);
                        expect(box.get("height")).to.equal(6);
                    });
                });
            });
        });

        it("only validates fields in passed array", function () {
            return this.User.build({
                validateTest: "cake", // invalid, but not saved
                validateCustom: "1"
            }).save({
                fields: ["validateCustom"]
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
                        return user.set({
                            name: "B",
                            bio: "B"
                        }).save();
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
                        return user.set({
                            name: "B",
                            bio: "B",
                            email: "B"
                        }).save();
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
                    await user.set({
                        name: "B"
                    }).save();
                }, orm.x.ValidationError);

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
                    await user.set({
                        name: "B",
                        email: "still.valid.email@gmail.com"
                    }).save();
                }, orm.x.ValidationError);

                const user2 = await User.findOne({});
                expect(user2.get("email")).to.equal("valid.email@gmail.com");
            });
        });

        it("stores an entry in the database", async function () {
            const username = "user";
            const User = this.User;
            const user = this.User.build({
                username,
                touchedAt: new Date(1984, 8, 23)
            });

            let users = await User.findAll();
            expect(users).to.have.length(0);
            await user.save();

            users = await User.findAll();
            expect(users).to.have.length(1);
            expect(users[0].username).to.equal(username);
            expect(users[0].touchedAt).to.be.instanceof(Date);
            expect(users[0].touchedAt).to.deep.equal(new Date(1984, 8, 23));
        });

        it("handles an entry with primaryKey of zero", function () {
            const username = "user";
            const newUsername = "newUser";
            const User2 = this.sequelize.define("User2", {
                id: {
                    type: type.INTEGER.UNSIGNED,
                    autoIncrement: false,
                    primaryKey: true
                },
                username: { type: type.STRING }
            });

            return User2.sync().then(() => {
                return User2.create({ id: 0, username }).then((user) => {
                    expect(user).to.be.ok();
                    expect(user.id).to.equal(0);
                    expect(user.username).to.equal(username);
                    return User2.findById(0).then((user) => {
                        expect(user).to.be.ok();
                        expect(user.id).to.equal(0);
                        expect(user.username).to.equal(username);
                        return user.updateAttributes({ username: newUsername }).then((user) => {
                            expect(user).to.be.ok();
                            expect(user.id).to.equal(0);
                            expect(user.username).to.equal(newUsername);
                        });
                    });
                });
            });
        });

        it("updates the timestamps", function () {
            const now = new Date();
            now.setMilliseconds(0);

            const user = this.User.build({ username: "user" });
            this.clock.tick(1000);

            return user.save().then((savedUser) => {
                expect(savedUser.updatedAt).to.be.a("date");
                expect(savedUser.updatedAt.getTime()).to.be.greaterThan(now.getTime());

                this.clock.tick(1000);
                return savedUser.save();
            }).then((updatedUser) => {
                expect(updatedUser.updatedAt).to.be.a("date");
                expect(updatedUser.updatedAt.getTime()).to.be.greaterThan(now.getTime());
            });
        });

        it("does not update timestamps when passing silent=true", async function () {
            const user = await this.User.create({ username: "user" });

            const updatedAt = user.updatedAt;

            this.clock.tick(1000);


            const user2 = await user.update({
                username: "userman"
            }, {
                silent: true
            });

            expect(user2.updatedAt).to.be.a("date");
            expect(user2.updatedAt).to.be.deep.equal(updatedAt);
        });

        it("does not update timestamps when passing silent=true in a bulk update", async function () {
            const self = this;
            const data = [
                { username: "Paul" },
                { username: "Peter" }
            ];

            await this.User.bulkCreate(data);
            let users = await this.User.findAll();

            const updatedAtPaul = users[0].updatedAt;
            const updatedAtPeter = users[1].updatedAt;
            this.clock.tick(150);

            await this.User.update(
                { aNumber: 1 },
                { where: {}, silent: true }
            );

            users = await self.User.findAll();
            expect(users[0].updatedAt).to.be.deep.equal(updatedAtPeter);
            expect(users[1].updatedAt).to.be.deep.equal(updatedAtPaul);
        });

        describe("when nothing changed", () => {
            it("does not update timestamps", function () {
                const self = this;
                return self.User.create({ username: "John" }).then(() => {
                    return self.User.findOne({ where: { username: "John" } }).then((user) => {
                        const updatedAt = user.updatedAt;
                        self.clock.tick(2000);
                        return user.save().then((newlySavedUser) => {
                            expect(newlySavedUser.updatedAt).to.deep.equal(updatedAt);
                            return self.User.findOne({ where: { username: "John" } }).then((newlySavedUser) => {
                                expect(newlySavedUser.updatedAt).to.deep.equal(updatedAt);
                            });
                        });
                    });
                });
            });

            it("should not throw ER_EMPTY_QUERY if changed only virtual fields", async function () {
                const User = this.sequelize.define(`User${config.rand()}`, {
                    name: type.STRING,
                    bio: {
                        type: type.VIRTUAL,
                        get: () => "swag"
                    }
                }, {
                    timestamps: false
                });
                await User.sync({ force: true });
                const user = await User.create({ name: "John", bio: "swag 1" });
                await user.update({ bio: "swag 2" });
            });
        });

        it("updates with function and column value", function () {
            const self = this;

            return this.User.create({
                aNumber: 42
            }).then((user) => {
                user.bNumber = self.sequelize.col("aNumber");
                user.username = self.sequelize.fn("upper", "sequelize");
                return user.save().then(() => {
                    return self.User.findById(user.id).then((user2) => {
                        expect(user2.username).to.equal("SEQUELIZE");
                        expect(user2.bNumber).to.equal(42);
                    });
                });
            });
        });

        describe("without timestamps option", () => {
            it("doesn't update the updatedAt column", function () {
                const User2 = this.sequelize.define("User2", {
                    username: type.STRING,
                    updatedAt: type.DATE
                }, { timestamps: false });
                return User2.sync().then(() => {
                    return User2.create({ username: "john doe" }).then((johnDoe) => {
                        // sqlite and mysql return undefined, whereas postgres returns null
                        expect([undefined, null].indexOf(johnDoe.updatedAt)).not.to.be.equal(-1);
                    });
                });
            });
        });

        describe("with custom timestamp options", () => {
            it("updates the createdAt column if updatedAt is disabled", async function () {
                const now = new Date();
                this.clock.tick(1000);

                const User2 = this.sequelize.define("User2", {
                    username: type.STRING
                }, { updatedAt: false });

                await User2.sync();
                const johnDoe = await User2.create({ username: "john doe" });
                expect(johnDoe.updatedAt).to.be.undefined();
                expect(now.getTime()).to.be.lessThan(johnDoe.createdAt.getTime());
            });

            it("updates the updatedAt column if createdAt is disabled", async function () {
                const now = new Date();
                this.clock.tick(1000);

                const User2 = this.sequelize.define("User2", {
                    username: type.STRING
                }, { createdAt: false });

                await User2.sync();
                const johnDoe = await User2.create({ username: "john doe" });
                expect(johnDoe.createdAt).to.be.undefined();
                expect(now.getTime()).to.be.lessThan(johnDoe.updatedAt.getTime());
            });

            it("works with `allowNull: false` on createdAt and updatedAt columns", function () {
                const User2 = this.sequelize.define("User2", {
                    username: type.STRING,
                    createdAt: {
                        type: type.DATE,
                        allowNull: false
                    },
                    updatedAt: {
                        type: type.DATE,
                        allowNull: false
                    }
                }, { timestamps: true });

                return User2.sync().then(() => {
                    return User2.create({ username: "john doe" }).then((johnDoe) => {
                        expect(johnDoe.createdAt).to.be.an.instanceof(Date);
                        expect(!isNaN(johnDoe.createdAt.valueOf())).to.be.ok();
                        expect(johnDoe.createdAt).to.be.deep.equal(johnDoe.updatedAt);
                    });
                });
            });
        });

        it("should fail a validation upon creating", function () {
            return this.User.create({ aNumber: 0, validateTest: "hello" }).catch((err) => {
                expect(err).to.exist();
                expect(err).to.be.instanceof(Object);
                expect(err.get("validateTest")).to.be.instanceof(Array);
                expect(err.get("validateTest")[0]).to.exist();
                expect(err.get("validateTest")[0].message).to.equal("Validation isInt on validateTest failed");
            });
        });

        it("should fail a validation upon creating with hooks false", function () {
            return this.User.create({ aNumber: 0, validateTest: "hello" }, { hooks: false }).catch((err) => {
                expect(err).to.exist();
                expect(err).to.be.instanceof(Object);
                expect(err.get("validateTest")).to.be.instanceof(Array);
                expect(err.get("validateTest")[0]).to.exist();
                expect(err.get("validateTest")[0].message).to.equal("Validation isInt on validateTest failed");
            });
        });

        it("should fail a validation upon building", function () {
            return this.User.build({ aNumber: 0, validateCustom: "aaaaaaaaaaaaaaaaaaaaaaaaaa" }).save()
                .catch((err) => {
                    expect(err).to.exist();
                    expect(err).to.be.instanceof(Object);
                    expect(err.get("validateCustom")).to.exist();
                    expect(err.get("validateCustom")).to.be.instanceof(Array);
                    expect(err.get("validateCustom")[0]).to.exist();
                    expect(err.get("validateCustom")[0].message).to.equal("Length failed.");
                });
        });

        it("should fail a validation when updating", function () {
            return this.User.create({ aNumber: 0 }).then((user) => {
                return user.updateAttributes({ validateTest: "hello" }).catch((err) => {
                    expect(err).to.exist();
                    expect(err).to.be.instanceof(Object);
                    expect(err.get("validateTest")).to.exist();
                    expect(err.get("validateTest")).to.be.instanceof(Array);
                    expect(err.get("validateTest")[0]).to.exist();
                    expect(err.get("validateTest")[0].message).to.equal("Validation isInt on validateTest failed");
                });
            });
        });

        it("takes zero into account", function () {
            return this.User.build({ aNumber: 0 }).save({
                fields: ["aNumber"]
            }).then((user) => {
                expect(user.aNumber).to.equal(0);
            });
        });

        it("saves a record with no primary key", function () {
            const HistoryLog = this.sequelize.define("HistoryLog", {
                someText: { type: type.STRING },
                aNumber: { type: type.INTEGER },
                aRandomId: { type: type.INTEGER }
            });
            return HistoryLog.sync().then(() => {
                return HistoryLog.create({ someText: "Some random text", aNumber: 3, aRandomId: 5 }).then((log) => {
                    return log.updateAttributes({ aNumber: 5 }).then((newLog) => {
                        expect(newLog.aNumber).to.equal(5);
                    });
                });
            });
        });

        describe("eagerly loaded objects", () => {
            beforeEach(function () {
                const self = this;
                this.UserEager = this.sequelize.define("UserEagerLoadingSaves", {
                    username: type.STRING,
                    age: type.INTEGER
                }, { timestamps: false });

                this.ProjectEager = this.sequelize.define("ProjectEagerLoadingSaves", {
                    title: type.STRING,
                    overdue_days: type.INTEGER
                }, { timestamps: false });

                this.UserEager.hasMany(this.ProjectEager, { as: "Projects", foreignKey: "PoobahId" });
                this.ProjectEager.belongsTo(this.UserEager, { as: "Poobah", foreignKey: "PoobahId" });

                return self.UserEager.sync({ force: true }).then(() => {
                    return self.ProjectEager.sync({ force: true });
                });
            });

            it("saves one object that has a collection of eagerly loaded objects", function () {
                const self = this;
                return this.UserEager.create({ username: "joe", age: 1 }).then((user) => {
                    return self.ProjectEager.create({ title: "project-joe1", overdue_days: 0 }).then((project1) => {
                        return self.ProjectEager.create({ title: "project-joe2", overdue_days: 0 }).then((project2) => {
                            return user.setProjects([project1, project2]).then(() => {
                                return self.UserEager.findOne({ where: { age: 1 }, include: [{ model: self.ProjectEager, as: "Projects" }] }).then((user) => {
                                    expect(user.username).to.equal("joe");
                                    expect(user.age).to.equal(1);
                                    expect(user.Projects).to.exist();
                                    expect(user.Projects.length).to.equal(2);

                                    user.age = user.age + 1; // happy birthday joe
                                    return user.save().then((user) => {
                                        expect(user.username).to.equal("joe");
                                        expect(user.age).to.equal(2);
                                        expect(user.Projects).to.exist();
                                        expect(user.Projects.length).to.equal(2);
                                    });
                                });
                            });
                        });
                    });
                });
            });

            it("saves many objects that each a have collection of eagerly loaded objects", function () {
                const self = this;
                return this.UserEager.create({ username: "bart", age: 20 }).then((bart) => {
                    return self.UserEager.create({ username: "lisa", age: 20 }).then((lisa) => {
                        return self.ProjectEager.create({ title: "detention1", overdue_days: 0 }).then((detention1) => {
                            return self.ProjectEager.create({ title: "detention2", overdue_days: 0 }).then((detention2) => {
                                return self.ProjectEager.create({ title: "exam1", overdue_days: 0 }).then((exam1) => {
                                    return self.ProjectEager.create({ title: "exam2", overdue_days: 0 }).then((exam2) => {
                                        return bart.setProjects([detention1, detention2]).then(() => {
                                            return lisa.setProjects([exam1, exam2]).then(() => {
                                                return self.UserEager.findAll({ where: { age: 20 }, order: [["username", "ASC"]], include: [{ model: self.ProjectEager, as: "Projects" }] }).then((simpsons) => {
                                                    expect(simpsons.length).to.equal(2);

                                                    const _bart = simpsons[0];
                                                    const _lisa = simpsons[1];

                                                    expect(_bart.Projects).to.exist();
                                                    expect(_lisa.Projects).to.exist();
                                                    expect(_bart.Projects.length).to.equal(2);
                                                    expect(_lisa.Projects.length).to.equal(2);

                                                    _bart.age = _bart.age + 1; // happy birthday bart - off to Moe's

                                                    return _bart.save().then((savedbart) => {
                                                        expect(savedbart.username).to.equal("bart");
                                                        expect(savedbart.age).to.equal(21);

                                                        _lisa.username = "lsimpson";

                                                        return _lisa.save().then((savedlisa) => {
                                                            expect(savedlisa.username).to.equal("lsimpson");
                                                            expect(savedlisa.age).to.equal(20);
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });

            it("saves many objects that each has one eagerly loaded object (to which they belong)", function () {
                const self = this;
                return this.UserEager.create({ username: "poobah", age: 18 }).then((user) => {
                    return self.ProjectEager.create({ title: "homework", overdue_days: 10 }).then((homework) => {
                        return self.ProjectEager.create({ title: "party", overdue_days: 2 }).then((party) => {
                            return user.setProjects([homework, party]).then(() => {
                                return self.ProjectEager.findAll({ include: [{ model: self.UserEager, as: "Poobah" }] }).then((projects) => {
                                    expect(projects.length).to.equal(2);
                                    expect(projects[0].Poobah).to.exist();
                                    expect(projects[1].Poobah).to.exist();
                                    expect(projects[0].Poobah.username).to.equal("poobah");
                                    expect(projects[1].Poobah.username).to.equal("poobah");

                                    projects[0].title = "partymore";
                                    projects[1].title = "partymore";
                                    projects[0].overdue_days = 0;
                                    projects[1].overdue_days = 0;

                                    return projects[0].save().then(() => {
                                        return projects[1].save().then(() => {
                                            return self.ProjectEager.findAll({ where: { title: "partymore", overdue_days: 0 }, include: [{ model: self.UserEager, as: "Poobah" }] }).then((savedprojects) => {
                                                expect(savedprojects.length).to.equal(2);
                                                expect(savedprojects[0].Poobah).to.exist();
                                                expect(savedprojects[1].Poobah).to.exist();
                                                expect(savedprojects[0].Poobah.username).to.equal("poobah");
                                                expect(savedprojects[1].Poobah.username).to.equal("poobah");
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    describe("findAll", () => {
        beforeEach(function () {
            this.ParanoidUser = this.sequelize.define("ParanoidUser", {
                username: { type: type.STRING }
            }, { paranoid: true });

            this.ParanoidUser.hasOne(this.ParanoidUser);
            return this.ParanoidUser.sync({ force: true });
        });

        it("sql should have paranoid condition", function () {
            const self = this;
            return self.ParanoidUser.create({ username: "cuss" })
                .then(() => {
                    return self.ParanoidUser.findAll();
                })
                .then((users) => {
                    expect(users).to.have.length(1);
                    return users[0].destroy();
                })
                .then(() => {
                    return self.ParanoidUser.findAll();
                })
                .then((users) => {
                    expect(users).to.have.length(0);
                });
        });

        it("sequelize.and as where should include paranoid condition", function () {
            const self = this;
            return self.ParanoidUser.create({ username: "cuss" })
                .then(() => {
                    return self.ParanoidUser.findAll({
                        where: self.sequelize.and({
                            username: "cuss"
                        })
                    });
                })
                .then((users) => {
                    expect(users).to.have.length(1);
                    return users[0].destroy();
                })
                .then(() => {
                    return self.ParanoidUser.findAll({
                        where: self.sequelize.and({
                            username: "cuss"
                        })
                    });
                })
                .then((users) => {
                    expect(users).to.have.length(0);
                });
        });

        it("sequelize.or as where should include paranoid condition", function () {
            const self = this;
            return self.ParanoidUser.create({ username: "cuss" })
                .then(() => {
                    return self.ParanoidUser.findAll({
                        where: self.sequelize.or({
                            username: "cuss"
                        })
                    });
                })
                .then((users) => {
                    expect(users).to.have.length(1);
                    return users[0].destroy();
                })
                .then(() => {
                    return self.ParanoidUser.findAll({
                        where: self.sequelize.or({
                            username: "cuss"
                        })
                    });
                })
                .then((users) => {
                    expect(users).to.have.length(0);
                });
        });

        it("escapes a single single quotes properly in where clauses", function () {
            const self = this;
            return this.User
                .create({ username: "user'name" })
                .then(() => {
                    return self.User.findAll({
                        where: { username: "user'name" }
                    }).then((users) => {
                        expect(users.length).to.equal(1);
                        expect(users[0].username).to.equal("user'name");
                    });
                });
        });

        it("escapes two single quotes properly in where clauses", function () {
            const self = this;
            return this.User
                .create({ username: "user''name" })
                .then(() => {
                    return self.User.findAll({
                        where: { username: "user''name" }
                    }).then((users) => {
                        expect(users.length).to.equal(1);
                        expect(users[0].username).to.equal("user''name");
                    });
                });
        });

        it("returns the timestamps if no attributes have been specified", function () {
            const self = this;
            return this.User.create({ username: "fnord" }).then(() => {
                return self.User.findAll().then((users) => {
                    expect(users[0].createdAt).to.exist();
                });
            });
        });

        it("does not return the timestamps if the username attribute has been specified", function () {
            const self = this;
            return this.User.create({ username: "fnord" }).then(() => {
                return self.User.findAll({ attributes: ["username"] }).then((users) => {
                    expect(users[0].createdAt).not.to.exist();
                    expect(users[0].username).to.exist();
                });
            });
        });

        it("creates the deletedAt property, when defining paranoid as true", function () {
            const self = this;
            return this.ParanoidUser.create({ username: "fnord" }).then(() => {
                return self.ParanoidUser.findAll().then((users) => {
                    expect(users[0].deletedAt).to.be.null();
                });
            });
        });

        it("destroys a record with a primary key of something other than id", function () {
            const UserDestroy = this.sequelize.define("UserDestroy", {
                newId: {
                    type: type.STRING,
                    primaryKey: true
                },
                email: type.STRING
            });

            return UserDestroy.sync().then(() => {
                return UserDestroy.create({ newId: "123ABC", email: "hello" }).then(() => {
                    return UserDestroy.findOne({ where: { email: "hello" } }).then((user) => {
                        return user.destroy();
                    });
                });
            });
        });

        it("sets deletedAt property to a specific date when deleting an instance", function () {
            const self = this;
            return this.ParanoidUser.create({ username: "fnord" }).then(() => {
                return self.ParanoidUser.findAll().then((users) => {
                    return users[0].destroy().then(() => {
                        expect(users[0].deletedAt.getMonth).to.exist();

                        return users[0].reload({ paranoid: false }).then((user) => {
                            expect(user.deletedAt.getMonth).to.exist();
                        });
                    });
                });
            });
        });

        it("keeps the deletedAt-attribute with value null, when running updateAttributes", function () {
            const self = this;
            return this.ParanoidUser.create({ username: "fnord" }).then(() => {
                return self.ParanoidUser.findAll().then((users) => {
                    return users[0].updateAttributes({ username: "newFnord" }).then((user) => {
                        expect(user.deletedAt).not.to.exist();
                    });
                });
            });
        });

        it("keeps the deletedAt-attribute with value null, when updating associations", function () {
            const self = this;
            return this.ParanoidUser.create({ username: "fnord" }).then(() => {
                return self.ParanoidUser.findAll().then((users) => {
                    return self.ParanoidUser.create({ username: "linkedFnord" }).then((linkedUser) => {
                        return users[0].setParanoidUser(linkedUser).then((user) => {
                            expect(user.deletedAt).not.to.exist();
                        });
                    });
                });
            });
        });

        it("can reuse query option objects", function () {
            const self = this;
            return this.User.create({ username: "fnord" }).then(() => {
                const query = { where: { username: "fnord" } };
                return self.User.findAll(query).then((users) => {
                    expect(users[0].username).to.equal("fnord");
                    return self.User.findAll(query).then((users) => {
                        expect(users[0].username).to.equal("fnord");
                    });
                });
            });
        });
    });

    describe("find", () => {
        it("can reuse query option objects", function () {
            const self = this;
            return this.User.create({ username: "fnord" }).then(() => {
                const query = { where: { username: "fnord" } };
                return self.User.findOne(query).then((user) => {
                    expect(user.username).to.equal("fnord");
                    return self.User.findOne(query).then((user) => {
                        expect(user.username).to.equal("fnord");
                    });
                });
            });
        });
        it("returns null for null, undefined, and unset boolean values", function () {
            const Setting = this.sequelize.define("SettingHelper", {
                setting_key: type.STRING,
                bool_value: { type: type.BOOLEAN, allowNull: true },
                bool_value2: { type: type.BOOLEAN, allowNull: true },
                bool_value3: { type: type.BOOLEAN, allowNull: true }
            }, { timestamps: false, logging: false });

            return Setting.sync({ force: true }).then(() => {
                return Setting.create({ setting_key: "test", bool_value: null, bool_value2: undefined }).then(() => {
                    return Setting.findOne({ where: { setting_key: "test" } }).then((setting) => {
                        expect(setting.bool_value).to.equal(null);
                        expect(setting.bool_value2).to.equal(null);
                        expect(setting.bool_value3).to.equal(null);
                    });
                });
            });
        });
    });

    describe("equals", () => {
        it("can compare records with Date field", function () {
            const self = this;
            return this.User.create({ username: "fnord" }).then((user1) => {
                return self.User.findOne({ where: { username: "fnord" } }).then((user2) => {
                    expect(user1.equals(user2)).to.be.true();
                });
            });
        });

        it("does not compare the existence of associations", function () {
            const self = this;

            this.UserAssociationEqual = this.sequelize.define("UserAssociationEquals", {
                username: type.STRING,
                age: type.INTEGER
            }, { timestamps: false });

            this.ProjectAssociationEqual = this.sequelize.define("ProjectAssocationEquals", {
                title: type.STRING,
                overdue_days: type.INTEGER
            }, { timestamps: false });

            this.UserAssociationEqual.hasMany(this.ProjectAssociationEqual, { as: "Projects", foreignKey: "userId" });
            this.ProjectAssociationEqual.belongsTo(this.UserAssociationEqual, { as: "Users", foreignKey: "userId" });

            return this.UserAssociationEqual.sync({ force: true }).then(() => {
                return self.ProjectAssociationEqual.sync({ force: true }).then(() => {
                    return self.UserAssociationEqual.create({ username: "jimhalpert" }).then((user1) => {
                        return self.ProjectAssociationEqual.create({ title: "A Cool Project" }).then((project1) => {
                            return user1.setProjects([project1]).then(() => {
                                return self.UserAssociationEqual.findOne({ where: { username: "jimhalpert" }, include: [{ model: self.ProjectAssociationEqual, as: "Projects" }] }).then((user2) => {
                                    return self.UserAssociationEqual.create({ username: "pambeesly" }).then((user3) => {
                                        expect(user1.get("Projects")).to.not.exist();
                                        expect(user2.get("Projects")).to.exist();
                                        expect(user1.equals(user2)).to.be.true();
                                        expect(user2.equals(user1)).to.be.true();
                                        expect(user1.equals(user3)).to.not.be.true();
                                        expect(user3.equals(user1)).to.not.be.true();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    describe("values", () => {
        it("returns all values", function () {
            const User = this.sequelize.define("UserHelper", {
                username: type.STRING
            }, { timestamps: false, logging: false });

            return User.sync().then(() => {
                const user = User.build({ username: "foo" });
                expect(user.get({ plain: true })).to.deep.equal({ username: "foo", id: null });
            });
        });
    });

    describe("destroy", () => {
        if (current.dialect.supports.transactions) {
            it("supports transactions", async function () {
                const sequelize = await this.prepareTransactionTest(this.sequelize);
                const User = sequelize.define("User", { username: type.STRING });
                await User.sync({ force: true });
                const user = await User.create({ username: "foo" });
                const t = await sequelize.transaction();
                await user.destroy({ transaction: t });
                const count1 = await User.count();
                const count2 = await User.count({ transaction: t });
                expect(count1).to.equal(1);
                expect(count2).to.equal(0);
                await t.rollback();
            });
        }

        it("does not set the deletedAt date in subsequent destroys if dao is paranoid", function () {
            const UserDestroy = this.sequelize.define("UserDestroy", {
                name: type.STRING,
                bio: type.TEXT
            }, { paranoid: true });

            return UserDestroy.sync({ force: true }).then(() => {
                return UserDestroy.create({ name: "hallo", bio: "welt" }).then((user) => {
                    return user.destroy().then(() => {
                        return user.reload({ paranoid: false }).then(() => {
                            const deletedAt = user.deletedAt;

                            return user.destroy().then(() => {
                                return user.reload({ paranoid: false }).then(() => {
                                    expect(user.deletedAt).to.eql(deletedAt);
                                });
                            });
                        });
                    });
                });
            });
        });

        it("deletes a record from the database if dao is not paranoid", function () {
            const UserDestroy = this.sequelize.define("UserDestroy", {
                name: type.STRING,
                bio: type.TEXT
            });

            return UserDestroy.sync({ force: true }).then(() => {
                return UserDestroy.create({ name: "hallo", bio: "welt" }).then((u) => {
                    return UserDestroy.findAll().then((users) => {
                        expect(users.length).to.equal(1);
                        return u.destroy().then(() => {
                            return UserDestroy.findAll().then((users) => {
                                expect(users.length).to.equal(0);
                            });
                        });
                    });
                });
            });
        });

        it("allows sql logging of delete statements", function () {
            const UserDelete = this.sequelize.define("UserDelete", {
                name: type.STRING,
                bio: type.TEXT
            });

            return UserDelete.sync({ force: true }).then(() => {
                return UserDelete.create({ name: "hallo", bio: "welt" }).then((u) => {
                    return UserDelete.findAll().then((users) => {
                        expect(users.length).to.equal(1);
                        return u.destroy({
                            logging(sql) {
                                expect(sql).to.exist();
                                expect(sql.toUpperCase().indexOf("DELETE")).to.be.above(-1);
                            }
                        });
                    });
                });
            });
        });

        it("delete a record of multiple primary keys table", function () {
            const MultiPrimary = this.sequelize.define("MultiPrimary", {
                bilibili: {
                    type: new type.CHAR(2),
                    primaryKey: true
                },

                guruguru: {
                    type: new type.CHAR(2),
                    primaryKey: true
                }
            });

            return MultiPrimary.sync({ force: true }).then(() => {
                return MultiPrimary.create({ bilibili: "bl", guruguru: "gu" }).then(() => {
                    return MultiPrimary.create({ bilibili: "bl", guruguru: "ru" }).then((m2) => {
                        return MultiPrimary.findAll().then((ms) => {
                            expect(ms.length).to.equal(2);
                            return m2.destroy({
                                logging(sql) {
                                    expect(sql).to.exist();
                                    expect(sql.toUpperCase().indexOf("DELETE")).to.be.above(-1);
                                    expect(sql.indexOf("ru")).to.be.above(-1);
                                    expect(sql.indexOf("bl")).to.be.above(-1);
                                }
                            }).then(() => {
                                return MultiPrimary.findAll().then((ms) => {
                                    expect(ms.length).to.equal(1);
                                    expect(ms[0].bilibili).to.equal("bl");
                                    expect(ms[0].guruguru).to.equal("gu");
                                });
                            });
                        });
                    });
                });
            });
        });

        if (dialect.match(/^postgres/)) {
            it("converts Infinity in where clause to a timestamp", function () {
                const Date = this.sequelize.define("Date",
                    {
                        date: {
                            type: type.DATE,
                            primaryKey: true
                        },
                        deletedAt: {
                            type: type.DATE,
                            defaultValue: Infinity
                        }
                    },
                    { paranoid: true });

                return this.sequelize.sync({ force: true })
                    .then(() => {
                        return Date.build({ date: Infinity })
                            .save()
                            .then((date) => {
                                return date.destroy();
                            });
                    });
            });
        }
    });

    describe("isSoftDeleted", () => {
        beforeEach(function () {
            this.ParanoidUser = this.sequelize.define("ParanoidUser", {
                username: { type: type.STRING }
            }, { paranoid: true });

            return this.ParanoidUser.sync({ force: true });
        });

        it("returns false if user is not soft deleted", function () {
            return this.ParanoidUser.create({ username: "fnord" }).then(() => {
                return this.ParanoidUser.findAll().then((users) => {
                    expect(users[0].isSoftDeleted()).to.be.false();
                });
            });
        });

        it("returns true if user is soft deleted", function () {
            return this.ParanoidUser.create({ username: "fnord" }).then(() => {
                return this.ParanoidUser.findAll().then((users) => {
                    return users[0].destroy().then(() => {
                        expect(users[0].isSoftDeleted()).to.be.true();

                        return users[0].reload({ paranoid: false }).then((user) => {
                            expect(user.isSoftDeleted()).to.be.true();
                        });
                    });
                });
            });
        });

        it("works with custom `deletedAt` field name", function () {
            const self = this;
            this.ParanoidUserWithCustomDeletedAt = this.sequelize.define("ParanoidUserWithCustomDeletedAt", {
                username: { type: type.STRING }
            }, {
                deletedAt: "deletedAtThisTime",
                paranoid: true
            });

            this.ParanoidUserWithCustomDeletedAt.hasOne(this.ParanoidUser);

            return this.ParanoidUserWithCustomDeletedAt.sync({ force: true }).then(() => {
                return this.ParanoidUserWithCustomDeletedAt.create({ username: "fnord" }).then(() => {
                    return self.ParanoidUserWithCustomDeletedAt.findAll().then((users) => {
                        expect(users[0].isSoftDeleted()).to.be.false();

                        return users[0].destroy().then(() => {
                            expect(users[0].isSoftDeleted()).to.be.true();

                            return users[0].reload({ paranoid: false }).then((user) => {
                                expect(user.isSoftDeleted()).to.be.true();
                            });
                        });
                    });
                });
            });
        });
    });

    describe("restore", () => {
        it("returns an error if the model is not paranoid", async function () {
            const user = await this.User.create({ username: "Peter", secretValue: "42" });
            await assert.throws(async () => {
                await user.restore();
            }, "Model is not paranoid");
        });

        it("restores a previously deleted model", function () {
            const self = this,
                ParanoidUser = self.sequelize.define("ParanoidUser", {
                    username: type.STRING,
                    secretValue: type.STRING,
                    data: type.STRING,
                    intVal: { type: type.INTEGER, defaultValue: 1 }
                }, {
                    paranoid: true
                }),
                data = [{ username: "Peter", secretValue: "42" },
                    { username: "Paul", secretValue: "43" },
                    { username: "Bob", secretValue: "44" }];

            return ParanoidUser.sync({ force: true }).then(() => {
                return ParanoidUser.bulkCreate(data);
            }).then(() => {
                return ParanoidUser.findOne({ where: { secretValue: "42" } });
            }).then((user) => {
                return user.destroy().then(() => {
                    return user.restore();
                });
            }).then(() => {
                return ParanoidUser.findOne({ where: { secretValue: "42" } });
            }).then((user) => {
                expect(user).to.be.ok();
                expect(user.username).to.equal("Peter");
            });
        });
    });
});
