import Support from "../support";

const { DataTypes } = adone.orm;

describe(Support.getTestDialectTeaser("Model"), () => {
    describe("optimistic locking", () => {
        let Account;
        beforeEach(function () {
            Account = this.sequelize.define("Account", {
                number: {
                    type: DataTypes.INTEGER
                }
            }, {
                version: true
            });
            return Account.sync({ force: true });
        });

        it("should increment the version on save", () => {
            return Account.create({ number: 1 }).then((account) => {
                account.number += 1;
                expect(account.version).to.eq(0);
                return account.save();
            }).then((account) => {
                expect(account.version).to.eq(1);
            });
        });

        it("should increment the version on update", () => {
            return Account.create({ number: 1 }).then((account) => {
                expect(account.version).to.eq(0);
                return account.update({ number: 2 });
            }).then((account) => {
                expect(account.version).to.eq(1);
                account.number += 1;
                return account.save();
            }).then((account) => {
                expect(account.number).to.eq(3);
                expect(account.version).to.eq(2);
            });
        });

        it("prevents stale instances from being saved", async () => {
            const accountA = await Account.create({ number: 1 });

            const accountB = await Account.findById(accountA.id);

            accountA.number += 1;

            await accountA.save();

            accountB.number += 1;

            await assert.throws(async () => {
                await accountB.save();
            }, Support.Sequelize.OptimisticLockError);
        });

        it("increment() also increments the version", () => {
            return Account.create({ number: 1 }).then((account) => {
                expect(account.version).to.eq(0);
                return account.increment("number", { by: 1 } );
            }).then((account) => {
                return account.reload();
            }).then((account) => {
                expect(account.version).to.eq(1);
            });
        });

        it("decrement() also increments the version", () => {
            return Account.create({ number: 1 }).then((account) => {
                expect(account.version).to.eq(0);
                return account.decrement("number", { by: 1 } );
            }).then((account) => {
                return account.reload();
            }).then((account) => {
                expect(account.version).to.eq(1);
            });
        });
    });
});
