describe("update", function () {
    const { orm, lodash: _ } = adone;
    const { type } = orm;
    const current = this.sequelize;

    beforeEach(function () {
        this.Account = this.sequelize.define("Account", {
            ownerId: {
                type: type.INTEGER,
                allowNull: false,
                field: "owner_id"
            },
            name: {
                type: type.STRING
            }
        });
        return this.Account.sync({ force: true });
    });

    it("should only update the passed fields", function () {
        return this.Account
            .create({ ownerId: 2 })
            .then((account) => this.Account.update({
                name: Math.random().toString()
            }, {
                where: {
                    id: account.get("id")
                }
            }));
    });


    if (_.get(current.dialect.supports, "returnValues.returning")) {
        it("should return the updated record", async function () {
            const account = await this.Account.create({ ownerId: 2 });
            const [, accounts] = await this.Account.update({ name: "FooBar" }, {
                where: {
                    id: account.get("id")
                },
                returning: true
            });
            const firstAcc = accounts[0];
            expect(firstAcc.ownerId).to.be.equal(2);
            expect(firstAcc.name).to.be.equal("FooBar");
        });
    }

    if (current.dialect.supports["LIMIT ON UPDATE"]) {
        it("should only update one row", function () {
            return this.Account.create({
                ownerId: 2,
                name: "Account Name 1"
            })
                .then(() => {
                    return this.Account.create({
                        ownerId: 2,
                        name: "Account Name 2"
                    });
                })
                .then(() => {
                    return this.Account.create({
                        ownerId: 2,
                        name: "Account Name 3"
                    });
                })
                .then(() => {
                    const options = {
                        where: {
                            ownerId: 2
                        },
                        limit: 1
                    };
                    return this.Account.update({ name: "New Name" }, options);
                })
                .then((account) => {
                    expect(account[0]).to.equal(1);
                });
        });
    }
});
