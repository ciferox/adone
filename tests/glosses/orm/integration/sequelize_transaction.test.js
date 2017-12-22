import Support from "./support";
const { promise } = adone;

const {
    Transaction,
    type
} = adone.orm;

const current = Support.sequelize;

describe(Support.getTestDialectTeaser("Sequelize#transaction"), { skip: !current.dialect.supports.transactions }, () => {
    beforeEach(function () {
        this.sinon = adone.shani.util.sandbox.create();
    });

    afterEach(function () {
        this.sinon.restore();
    });

    describe("then", () => {
        it("gets triggered once a transaction has been successfully committed", function () {
            let called = false;
            return this
                .sequelize
                .transaction().then((t) => {
                    return t.commit().then(() => {
                        called = 1;
                    });
                })
                .then(() => {
                    expect(called).to.be.ok();
                });
        });

        it("gets triggered once a transaction has been successfully rolled back", function () {
            let called = false;
            return this
                .sequelize
                .transaction().then((t) => {
                    return t.rollback().then(() => {
                        called = 1;
                    });
                })
                .then(() => {
                    expect(called).to.be.ok();
                });
        });

        if (Support.getTestDialect() !== "sqlite") {
            it("works for long running transactions", async function () {
                this.sequelize = await Support.prepareTransactionTest(this.sequelize);

                this.User = this.sequelize.define("User", {
                    name: type.STRING
                }, { timestamps: false });

                await this.sequelize.sync({ force: true });
                const t = await this.sequelize.transaction();
                let query = "select sleep(2);";

                switch (Support.getTestDialect()) {
                    case "postgres":
                        query = "select pg_sleep(2);";
                        break;
                    case "sqlite":
                        query = "select sqlite3_sleep(2000);";
                        break;
                    case "mssql":
                        query = "WAITFOR DELAY '00:00:02';";
                        break;
                    default:
                        break;
                }

                await this.sequelize.query(query, { transaction: t });
                await this.User.create({ name: "foo" });
                await this.sequelize.query(query, { transaction: t });
                await t.commit();
                const users = await this.User.all();
                expect(users.length).to.equal(1);
                expect(users[0].name).to.equal("foo");
            });
        }
    });

    describe("complex long running example", () => {
        it("works with promise syntax", function () {
            return Support.prepareTransactionTest(this.sequelize).then((sequelize) => {
                const Test = sequelize.define("Test", {
                    id: { type: type.INTEGER, primaryKey: true, autoIncrement: true },
                    name: { type: type.STRING }
                });

                return sequelize.sync({ force: true }).then(() => {
                    return sequelize.transaction().then((transaction) => {
                        expect(transaction).to.be.instanceOf(Transaction);

                        return Test
                            .create({ name: "Peter" }, { transaction })
                            .then(() => {
                                return promise.delay(1000).then(() => {
                                    return transaction
                                        .commit()
                                        .then(() => {
                                            return Test.count();
                                        })
                                        .then((count) => {
                                            expect(count).to.equal(1);
                                        });
                                });
                            });
                    });
                });
            });
        });
    });

    describe("concurrency", () => {
        describe("having tables with uniqueness constraints", () => {
            beforeEach(function () {
                const self = this;

                return Support.prepareTransactionTest(this.sequelize).then((sequelize) => {
                    self.sequelize = sequelize;

                    self.Model = sequelize.define("Model", {
                        name: { type: type.STRING, unique: true }
                    }, {
                        timestamps: false
                    });

                    return self.Model.sync({ force: true });
                });
            });

            it("triggers the error event for the second transactions", function () {
                const self = this;

                return this.sequelize.transaction().then((t1) => {
                    return self.sequelize.transaction().then((t2) => {
                        return self.Model.create({ name: "omnom" }, { transaction: t1 }).then(() => {
                            return Promise.all([
                                self.Model.create({ name: "omnom" }, { transaction: t2 }).catch((err) => {
                                    expect(err).to.be.ok();
                                    return t2.rollback();
                                }),
                                promise.delay(100).then(() => {
                                    return t1.commit();
                                })
                            ]);
                        });
                    });
                });
            });
        });
    });
});
