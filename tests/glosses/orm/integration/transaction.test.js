describe("transaction", function () {
    const dialect = this.getTestDialect();
    const { promise } = adone;
    const { orm } = adone;
    const { type, Transaction } = orm;
    const current = this.sequelize;

    if (!current.dialect.supports.transactions) {
        return;
    }
    beforeEach(function () {
        this.sinon = adone.shani.util.sandbox.create();
    });

    afterEach(function () {
        this.sinon.restore();
    });

    describe("constructor", () => {
        it("stores options", function () {
            const transaction = new Transaction(this.sequelize);
            expect(transaction.options).to.be.an.instanceOf(Object);
        });

        it("generates an identifier", function () {
            const transaction = new Transaction(this.sequelize);
            expect(transaction.id).to.exist();
        });

        it("should call dialect specific generateTransactionId method", function () {
            const transaction = new Transaction(this.sequelize);
            expect(transaction.id).to.exist();
            if (dialect === "mssql") {
                expect(transaction.id).to.have.lengthOf(20);
            }
        });
    });

    describe("commit", () => {
        it("is a commit method available", () => {
            expect(Transaction).to.respondTo("commit");
        });
    });

    describe("rollback", () => {
        it("is a rollback method available", () => {
            expect(Transaction).to.respondTo("rollback");
        });
    });

    describe("autoCallback", () => {
        it("supports automatically committing", async function () {
            await this.sequelize.transaction(() => {
                return Promise.resolve();
            });
        });

        it("supports automatically rolling back with a thrown error", async function () {
            let t;
            await assert.throws(async () => {
                await this.sequelize.transaction((transaction) => {
                    t = transaction;
                    throw new Error("Yolo");
                });
            });
            expect(t.finished).to.be.equal("rollback");
        });

        it("supports automatically rolling back with a rejection", async function () {
            let t;
            await assert.throws(async () => {
                await this.sequelize.transaction((transaction) => {
                    t = transaction;
                    return Promise.reject(new Error("Swag"));
                });
            });
            expect(t.finished).to.be.equal("rollback");
        });

        it("do not rollback if already committed", { skip: dialect !== "postgres" }, async function () {
            const SumSumSum = this.sequelize.define("transaction", {
                value: {
                    type: new type.DECIMAL(10, 3),
                    field: "value"
                }
            });
            const self = this;
            const transTest = function (val) {
                return self.sequelize.transaction({ isolationLevel: "SERIALIZABLE" }, (t) => {
                    return SumSumSum.sum("value", { transaction: t }).then(() => {
                        return SumSumSum.create({ value: -val }, { transaction: t });
                    });
                });
            };
            // Attention: this test is a bit racy. If you find a nicer way to test this: go ahead
            await SumSumSum.sync({ force: true });
            await assert.throws(async () => {
                await Promise.all([transTest(80), transTest(80), transTest(80)]);
            }, "could not serialize access due to read/write dependencies among transactions");
            await promise.delay(100);
            // ...
            if (self.sequelize.test.$runningQueries !== 0) {
                await promise.delay(200);
            }
            if (self.sequelize.test.$runningQueries !== 0) {
                await promise.delay(500);
            }
        });
    });

    it("does not allow queries after commit", async function () {
        const self = this;
        const t = await this.sequelize.transaction();
        await self.sequelize.query("SELECT 1+1", { transaction: t, raw: true });
        await t.commit();
        const err = await assert.throws(async () => {
            await self.sequelize.query("SELECT 1+1", { transaction: t, raw: true });
        }, /commit has been called on this transaction\([^)]+\), you can no longer use it\. \(The rejected query is attached as the 'sql' property of this error\)/);
        expect(err.sql).to.equal("SELECT 1+1");
    });

    it("does not allow queries immediatly after commit call", async function () {
        const self = this;
        const t = await this.sequelize.transaction();
        await self.sequelize.query("SELECT 1+1", { transaction: t, raw: true });
        const commit = t.commit();
        const err = await assert.throws(async () => {
            await self.sequelize.query("SELECT 1+1", { transaction: t, raw: true });
        }, /commit has been called on this transaction\([^)]+\), you can no longer use it\. \(The rejected query is attached as the 'sql' property of this error\)/);
        expect(err.sql).to.be.equal("SELECT 1+1");
        await commit;
    });

    it("does not allow queries after rollback", async function () {
        const t = await this.sequelize.transaction();
        await this.sequelize.query("SELECT 1+1", { transaction: t, raw: true });
        await t.rollback();
        await assert.throws(async () => {
            await this.sequelize.query("SELECT 1+1", { transaction: t, raw: true });
        });
    });

    it("does not allow queries immediatly after rollback call", async function () {
        const self = this;
        const t = await this.sequelize.transaction();
        const rollback = t.rollback();
        const err = await assert.throws(async () => {
            await self.sequelize.query("SELECT 1+1", { transaction: t, raw: true });
        }, /rollback has been called on this transaction\([^)]+\), you can no longer use it\. \(The rejected query is attached as the 'sql' property of this error\)/);
        expect(err.sql).to.equal("SELECT 1+1");
        await rollback;
    });

    it("does not allow commits after commit", async function () {
        const self = this;
        const t = await self.sequelize.transaction();
        await t.commit();
        await assert.throws(async () => {
            await t.commit();
        }, "Transaction cannot be committed because it has been finished with state: commit");
    });

    it("does not allow commits after rollback", async function () {
        const self = this;
        const t = await self.sequelize.transaction();
        await t.rollback();
        await assert.throws(async () => {
            await t.commit();
        }, "Transaction cannot be committed because it has been finished with state: rollback");
    });

    it("does not allow rollbacks after commit", async function () {
        const self = this;
        const t = await self.sequelize.transaction();
        await t.commit();
        await assert.throws(async () => {
            await t.rollback();
        }, "Transaction cannot be rolled back because it has been finished with state: commit");
    });

    it("does not allow rollbacks after rollback", async function () {
        const self = this;
        const t = await self.sequelize.transaction();
        await t.rollback();
        await assert.throws(async () => {
            await t.rollback();
        }, "Transaction cannot be rolled back because it has been finished with state: rollback");
    });

    it("works even if a transaction: null option is passed", async function () {
        this.sinon.spy(this.sequelize, "query");

        const t = await this.sequelize.transaction({
            transaction: null
        });
        await t.commit();
        expect(this.sequelize.query.callCount).to.be.greaterThan(0);

        for (let i = 0; i < this.sequelize.query.callCount; i++) {
            expect(this.sequelize.query.getCall(i).args[1].transaction).to.equal(t);
        }
    });

    it("works even if a transaction: undefined option is passed", async function () {
        this.sinon.spy(this.sequelize, "query");

        const t = await this.sequelize.transaction({
            transaction: undefined
        });
        await t.commit();
        expect(this.sequelize.query.callCount).to.be.greaterThan(0);

        for (let i = 0; i < this.sequelize.query.callCount; i++) {
            expect(this.sequelize.query.getCall(i).args[1].transaction).to.equal(t);
        }
    });

    if (dialect === "sqlite") {
        it("provides persistent transactions", () => {
            const sequelize = orm.create("database", "username", "password", { dialect: "sqlite" });
            const User = sequelize.define("user", {
                username: type.STRING,
                awesome: type.BOOLEAN
            });
            let persistentTransaction;

            return sequelize.transaction().then((t) => {
                return sequelize.sync({ transaction: t }).then(() => {
                    return t;
                });
            }).then((t) => {
                return User.create({}, { transaction: t }).then(() => {
                    return t.commit();
                });
            }).then(() => {
                return sequelize.transaction().then((t) => {
                    persistentTransaction = t;
                });
            }).then(() => {
                return User.findAll({ transaction: persistentTransaction }).then((users) => {
                    expect(users.length).to.equal(1);
                    return persistentTransaction.commit();
                });
            });
        });
    }

    if (current.dialect.supports.transactionOptions.type) {
        describe("transaction types", () => {
            it("should support default transaction type DEFERRED", async function () {
                const t = await this.sequelize.transaction({});
                await t.rollback();
                expect(t.options.type).to.equal("DEFERRED");
            });

            Object.keys(Transaction.TYPES).forEach((key) => {
                it(`should allow specification of ${key} type`, async function () {
                    const t = await this.sequelize.transaction({
                        type: key
                    });
                    await t.rollback();
                    expect(t.options.type).to.equal(Transaction.TYPES[key]);
                });
            });
        });
    }

    if (dialect === "sqlite") {
        it("automatically retries on SQLITE_BUSY failure", async function () {
            const sequelize = await this.prepareTransactionTest(this.sequelize);
            const User = sequelize.define("User", { username: type.STRING });
            await User.sync({ force: true });
            const newTransactionFunc = async () => {
                const t = await sequelize.transaction({ type: orm.Transaction.TYPES.EXCLUSIVE });
                await User.create({}, { transaction: t });
                await t.commit();
            };

            await Promise.all([newTransactionFunc(), newTransactionFunc()]);
            const users = await User.findAll();
            expect(users.length).to.equal(2);
        });

        it("fails with SQLITE_BUSY when retry.match is changed", async function () {
            const sequelize = await this.prepareTransactionTest(this.sequelize);
            const User = sequelize.define("User", { id: { type: type.INTEGER, primaryKey: true }, username: type.STRING });
            await User.sync({ force: true });
            const newTransactionFunc = async () => {
                const t = await sequelize.transaction({ type: orm.Transaction.TYPES.EXCLUSIVE, retry: { match: ["NO_MATCH"] } });
                // introduce delay to force the busy state race condition to fail
                await promise.delay(1000);
                await User.create({ id: null, username: `test ${t.id}` }, { transaction: t });
                await t.commit();
            };
            await assert.throws(async () => {
                await Promise.all([newTransactionFunc(), newTransactionFunc()]);
            }, "SQLITE_BUSY: database is locked");
        });

    }

    describe("row locking", { skip: !current.dialect.supports.lock }, () => {
        it("supports for update", async function () {
            const User = this.sequelize.define("user", {
                username: type.STRING,
                awesome: type.BOOLEAN
            });
            const self = this;
            const t1Spy = spy();
            const t2Spy = spy();

            await this.sequelize.sync({ force: true });
            await User.create({ username: "jan" });
            const t1 = await self.sequelize.transaction();
            const t1Jan = await User.find({
                where: {
                    username: "jan"
                },
                lock: t1.LOCK.UPDATE,
                transaction: t1
            });
            const t2 = await self.sequelize.transaction({
                isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
            });
            await Promise.all([
                User.find({
                    where: {
                        username: "jan"
                    },
                    lock: t2.LOCK.UPDATE,
                    transaction: t2
                }).then(() => {
                    t2Spy();
                    return t2.commit().then(() => {
                        expect(t2Spy).to.have.been.calledAfter(t1Spy); // Find should not succeed before t1 has comitted
                    });
                }),
                t1Jan.updateAttributes({
                    awesome: true
                }, {
                    transaction: t1
                }).then(() => {
                    t1Spy();
                    return promise.delay(2000).then(() => {
                        return t1.commit();
                    });
                })
            ]);
        });

        it("fail locking with outer joins", async function () {
            const User = this.sequelize.define("User", { username: type.STRING });
            const Task = this.sequelize.define("Task", { title: type.STRING, active: type.BOOLEAN });
            const self = this;

            User.belongsToMany(Task, { through: "UserTasks" });
            Task.belongsToMany(User, { through: "UserTasks" });

            await this.sequelize.sync({ force: true });
            const [john, task1] = await Promise.all([
                User.create({ username: "John" }),
                Task.create({ title: "Get rich", active: false })
            ]);
            await john.setTasks([task1]);
            await self.sequelize.transaction(async (t1) => {
                if (current.dialect.supports.lockOuterJoinFailure) {
                    await assert.throws(async () => {
                        await User.find({
                            where: {
                                username: "John"
                            },
                            include: [Task],
                            lock: t1.LOCK.UPDATE,
                            transaction: t1
                        });
                    }, "FOR UPDATE cannot be applied to the nullable side of an outer join");
                } else {
                    await User.find({
                        where: {
                            username: "John"
                        },
                        include: [Task],
                        lock: t1.LOCK.UPDATE,
                        transaction: t1
                    });
                }

            });
        });

        if (current.dialect.supports.lockOf) {
            it("supports for update of table", async function () {
                const User = this.sequelize.define("User", { username: type.STRING }, { tableName: "Person" });
                const Task = this.sequelize.define("Task", { title: type.STRING, active: type.BOOLEAN });
                const self = this;

                User.belongsToMany(Task, { through: "UserTasks" });
                Task.belongsToMany(User, { through: "UserTasks" });

                await this.sequelize.sync({ force: true });

                const [john, task1] = await Promise.all([
                    User.create({ username: "John" }),
                    Task.create({ title: "Get rich", active: false }),
                    Task.create({ title: "Die trying", active: false })
                ]);
                await john.setTasks([task1]);

                await self.sequelize.transaction(async (t1) => {
                    const t1John = await User.find({
                        where: {
                            username: "John"
                        },
                        include: [Task],
                        lock: {
                            level: t1.LOCK.UPDATE,
                            of: User
                        },
                        transaction: t1
                    });
                    // should not be blocked by the lock of the other transaction
                    await self.sequelize.transaction(async (t2) => {
                        await Task.update({
                            active: true
                        }, {
                            where: {
                                active: false
                            },
                            transaction: t2
                        });
                    });
                    await t1John.save({ transaction: t1 });
                });
            });
        }

        if (current.dialect.supports.lockKey) {
            it("supports for key share", function () {
                const User = this.sequelize.define("user", {
                    username: type.STRING,
                    awesome: type.BOOLEAN
                });
                const self = this;
                const t1Spy = spy();
                const t2Spy = spy();

                return this.sequelize.sync({ force: true }).then(() => {
                    return User.create({ username: "jan" });
                }).then(() => {
                    return self.sequelize.transaction().then((t1) => {
                        return User.find({
                            where: {
                                username: "jan"
                            },
                            lock: t1.LOCK.NO_KEY_UPDATE,
                            transaction: t1
                        }).then((t1Jan) => {
                            return self.sequelize.transaction().then((t2) => {
                                return Promise.all([
                                    User.find({
                                        where: {
                                            username: "jan"
                                        },
                                        lock: t2.LOCK.KEY_SHARE,
                                        transaction: t2
                                    }).then(() => {
                                        t2Spy();
                                        return t2.commit();
                                    }),
                                    t1Jan.update({
                                        awesome: true
                                    }, {
                                        transaction: t1
                                    }).then(() => {
                                        return promise.delay(2000).then(() => {
                                            t1Spy();
                                            expect(t1Spy).to.have.been.calledAfter(t2Spy);
                                            return t1.commit();
                                        });
                                    })
                                ]);
                            });
                        });
                    });
                });
            });
        }

        it("supports for share", function () {
            const User = this.sequelize.define("user", {
                username: type.STRING,
                awesome: type.BOOLEAN
            });
            const self = this;
            const t1Spy = spy();
            const t2FindSpy = spy();
            const t2UpdateSpy = spy();

            return this.sequelize.sync({ force: true }).then(() => {
                return User.create({ username: "jan" });
            }).then(() => {
                return self.sequelize.transaction().then((t1) => {
                    return User.find({
                        where: {
                            username: "jan"
                        },
                        lock: t1.LOCK.SHARE,
                        transaction: t1
                    }).then((t1Jan) => {
                        return self.sequelize.transaction({
                            isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
                        }).then((t2) => {
                            return Promise.all([
                                User.find({
                                    where: {
                                        username: "jan"
                                    },
                                    transaction: t2
                                }).then((t2Jan) => {
                                    t2FindSpy();
                                    return t2Jan.updateAttributes({
                                        awesome: false
                                    }, {
                                        transaction: t2
                                    }).then(() => {
                                        t2UpdateSpy();
                                        return t2.commit().then(() => {
                                            expect(t2FindSpy).to.have.been.calledBefore(t1Spy); // The find call should have returned
                                            expect(t2UpdateSpy).to.have.been.calledAfter(t1Spy); // But the update call should not happen before the first transaction has committed
                                        });
                                    });
                                }),

                                t1Jan.updateAttributes({
                                    awesome: true
                                }, {
                                    transaction: t1
                                }).then(() => {
                                    return promise.delay(2000).then(() => {
                                        t1Spy();
                                        return t1.commit();
                                    });
                                })
                            ]);
                        });
                    });
                });
            });
        });
    });
});
