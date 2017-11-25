import Support from "../support";

const { orm } = adone;
const { type } = orm;

describe(Support.getTestDialectTeaser("Hooks"), () => {
    beforeEach(function () {
        this.User = this.sequelize.define("User", {
            username: {
                type: type.STRING,
                allowNull: false
            },
            mood: {
                type: type.ENUM,
                values: ["happy", "sad", "neutral"]
            }
        });

        this.ParanoidUser = this.sequelize.define("ParanoidUser", {
            username: type.STRING,
            mood: {
                type: type.ENUM,
                values: ["happy", "sad", "neutral"]
            }
        }, {
            paranoid: true
        });

        return this.sequelize.sync({ force: true });
    });

    describe("#bulkCreate", () => {
        describe("on success", () => {
            it("should run hooks", function () {
                const beforeBulk = spy();
                const afterBulk = spy();

                this.User.beforeBulkCreate(beforeBulk);

                this.User.afterBulkCreate(afterBulk);

                return this.User.bulkCreate([
                    { username: "Cheech", mood: "sad" },
                    { username: "Chong", mood: "sad" }
                ]).then(() => {
                    expect(beforeBulk).to.have.been.calledOnce;
                    expect(afterBulk).to.have.been.calledOnce;
                });
            });
        });

        describe("on error", () => {
            it("should return an error from before", async function () {
                this.User.beforeBulkCreate(() => {
                    throw new Error("Whoops!");
                });

                await assert.throws(async () => {
                    await this.User.bulkCreate([
                        { username: "Cheech", mood: "sad" },
                        { username: "Chong", mood: "sad" }
                    ]);
                });
            });

            it("should return an error from after", async function () {
                this.User.afterBulkCreate(() => {
                    throw new Error("Whoops!");
                });

                await assert.throws(async () => {
                    await this.User.bulkCreate([
                        { username: "Cheech", mood: "sad" },
                        { username: "Chong", mood: "sad" }
                    ]);
                });
            });
        });

        describe("with the {individualHooks: true} option", () => {
            beforeEach(function () {
                this.User = this.sequelize.define("User", {
                    username: {
                        type: type.STRING,
                        defaultValue: ""
                    },
                    beforeHookTest: {
                        type: type.BOOLEAN,
                        defaultValue: false
                    },
                    aNumber: {
                        type: type.INTEGER,
                        defaultValue: 0
                    }
                });

                return this.User.sync({ force: true });
            });

            it("should run the afterCreate/beforeCreate functions for each item created successfully", function () {
                let beforeBulkCreate = false;
                let afterBulkCreate = false;

                this.User.beforeBulkCreate(() => {
                    beforeBulkCreate = true;
                    return Promise.resolve();
                });

                this.User.afterBulkCreate(() => {
                    afterBulkCreate = true;
                    return Promise.resolve();
                });

                this.User.beforeCreate((user) => {
                    user.beforeHookTest = true;
                    return Promise.resolve();
                });

                this.User.afterCreate((user) => {
                    user.username = `User${user.id}`;
                    return Promise.resolve();
                });

                return this.User.bulkCreate([{ aNumber: 5 }, { aNumber: 7 }, { aNumber: 3 }], { fields: ["aNumber"], individualHooks: true }).then((records) => {
                    records.forEach((record) => {
                        expect(record.username).to.equal(`User${record.id}`);
                        expect(record.beforeHookTest).to.be.true;
                    });
                    expect(beforeBulkCreate).to.be.true;
                    expect(afterBulkCreate).to.be.true;
                });
            });

            it("should run the afterCreate/beforeCreate functions for each item created with an error", function () {
                let beforeBulkCreate = false;
                let afterBulkCreate = false;

                this.User.beforeBulkCreate(() => {
                    beforeBulkCreate = true;
                    return Promise.resolve();
                });

                this.User.afterBulkCreate(() => {
                    afterBulkCreate = true;
                    return Promise.resolve();
                });

                this.User.beforeCreate(() => {
                    return Promise.reject(new Error("You shall not pass!"));
                });

                this.User.afterCreate((user) => {
                    user.username = `User${user.id}`;
                    return Promise.resolve();
                });

                return this.User.bulkCreate([{ aNumber: 5 }, { aNumber: 7 }, { aNumber: 3 }], { fields: ["aNumber"], individualHooks: true }).catch((err) => {
                    expect(err).to.be.instanceOf(Error);
                    expect(beforeBulkCreate).to.be.true;
                    expect(afterBulkCreate).to.be.false;
                });
            });
        });
    });

    describe("#bulkUpdate", () => {
        describe("on success", () => {
            it("should run hooks", function () {
                const self = this;
                const beforeBulk = spy();
                const afterBulk = spy();

                this.User.beforeBulkUpdate(beforeBulk);
                this.User.afterBulkUpdate(afterBulk);

                return this.User.bulkCreate([
                    { username: "Cheech", mood: "sad" },
                    { username: "Chong", mood: "sad" }
                ]).then(() => {
                    return self.User.update({ mood: "happy" }, { where: { mood: "sad" } }).then(() => {
                        expect(beforeBulk).to.have.been.calledOnce;
                        expect(afterBulk).to.have.been.calledOnce;
                    });
                });
            });
        });

        describe("on error", () => {
            it("should return an error from before", async function () {
                const self = this;

                this.User.beforeBulkUpdate(() => {
                    throw new Error("Whoops!");
                });

                await this.User.bulkCreate([
                    { username: "Cheech", mood: "sad" },
                    { username: "Chong", mood: "sad" }
                ]);

                await assert.throws(async () => {
                    await self.User.update({ mood: "happy" }, { where: { mood: "sad" } });
                });
            });

            it("should return an error from after", async function () {
                const self = this;

                this.User.afterBulkUpdate(() => {
                    throw new Error("Whoops!");
                });

                await this.User.bulkCreate([
                    { username: "Cheech", mood: "sad" },
                    { username: "Chong", mood: "sad" }
                ]);

                await assert.throws(async () => {
                    await self.User.update({ mood: "happy" }, { where: { mood: "sad" } });
                });
            });
        });

        describe("with the {individualHooks: true} option", () => {
            beforeEach(function () {
                this.User = this.sequelize.define("User", {
                    username: {
                        type: type.STRING,
                        defaultValue: ""
                    },
                    beforeHookTest: {
                        type: type.BOOLEAN,
                        defaultValue: false
                    },
                    aNumber: {
                        type: type.INTEGER,
                        defaultValue: 0
                    }
                });

                return this.User.sync({ force: true });
            });

            it("should run the after/before functions for each item created successfully", async function () {
                const self = this;
                const beforeBulk = spy();
                const afterBulk = spy();

                this.User.beforeBulkUpdate(beforeBulk);

                this.User.afterBulkUpdate(afterBulk);

                this.User.beforeUpdate((user) => {
                    expect(user.changed()).to.not.be.empty;
                    user.beforeHookTest = true;
                });

                this.User.afterUpdate((user) => {
                    user.username = `User${user.id}`;
                });

                await this.User.bulkCreate([
                    { aNumber: 1 }, { aNumber: 1 }, { aNumber: 1 }
                ]);
                const [, records] = await self.User.update({ aNumber: 10 }, { where: { aNumber: 1 }, individualHooks: true });
                records.forEach((record) => {
                    expect(record.username).to.equal(`User${record.id}`);
                    expect(record.beforeHookTest).to.be.true;
                });
                expect(beforeBulk).to.have.been.calledOnce;
                expect(afterBulk).to.have.been.calledOnce;
            });

            it("should run the after/before functions for each item created successfully changing some data before updating", async function () {
                const self = this;

                this.User.beforeUpdate((user) => {
                    expect(user.changed()).to.not.be.empty;
                    if (user.get("id") === 1) {
                        user.set("aNumber", user.get("aNumber") + 3);
                    }
                });

                await this.User.bulkCreate([
                    { aNumber: 1 }, { aNumber: 1 }, { aNumber: 1 }
                ]);
                const [, records] = await self.User.update({ aNumber: 10 }, { where: { aNumber: 1 }, individualHooks: true });
                records.forEach((record) => {
                    expect(record.aNumber).to.equal(10 + (record.id === 1 ? 3 : 0));
                });
            });

            it("should run the after/before functions for each item created with an error", function () {
                const self = this;
                const beforeBulk = spy();
                const afterBulk = spy();

                this.User.beforeBulkUpdate(beforeBulk);

                this.User.afterBulkUpdate(afterBulk);

                this.User.beforeUpdate(() => {
                    throw new Error("You shall not pass!");
                });

                this.User.afterUpdate((user) => {
                    user.username = `User${user.id}`;
                });

                return this.User.bulkCreate([{ aNumber: 1 }, { aNumber: 1 }, { aNumber: 1 }], { fields: ["aNumber"] }).then(() => {
                    return self.User.update({ aNumber: 10 }, { where: { aNumber: 1 }, individualHooks: true }).catch((err) => {
                        expect(err).to.be.instanceOf(Error);
                        expect(err.message).to.be.equal("You shall not pass!");
                        expect(beforeBulk).to.have.been.calledOnce;
                        expect(afterBulk).not.to.have.been.called;
                    });
                });
            });
        });
    });

    describe("#bulkDestroy", () => {
        describe("on success", () => {
            it("should run hooks", function () {
                const beforeBulk = spy();
                const afterBulk = spy();

                this.User.beforeBulkDestroy(beforeBulk);
                this.User.afterBulkDestroy(afterBulk);

                return this.User.destroy({ where: { username: "Cheech", mood: "sad" } }).then(() => {
                    expect(beforeBulk).to.have.been.calledOnce;
                    expect(afterBulk).to.have.been.calledOnce;
                });
            });
        });

        describe("on error", () => {
            it("should return an error from before", async function () {
                this.User.beforeBulkDestroy(() => {
                    throw new Error("Whoops!");
                });

                await assert.throws(async () => {
                    await this.User.destroy({ where: { username: "Cheech", mood: "sad" } });
                });
            });

            it("should return an error from after", async function () {
                this.User.afterBulkDestroy(() => {
                    throw new Error("Whoops!");
                });

                await assert.throws(async () => {
                    await this.User.destroy({ where: { username: "Cheech", mood: "sad" } });
                });
            });
        });

        describe("with the {individualHooks: true} option", () => {
            beforeEach(function () {
                this.User = this.sequelize.define("User", {
                    username: {
                        type: type.STRING,
                        defaultValue: ""
                    },
                    beforeHookTest: {
                        type: type.BOOLEAN,
                        defaultValue: false
                    },
                    aNumber: {
                        type: type.INTEGER,
                        defaultValue: 0
                    }
                });

                return this.User.sync({ force: true });
            });

            it("should run the after/before functions for each item created successfully", function () {
                const self = this;
                let beforeBulk = false;
                let afterBulk = false;
                let beforeHook = false;
                let afterHook = false;

                this.User.beforeBulkDestroy(() => {
                    beforeBulk = true;
                    return Promise.resolve();
                });

                this.User.afterBulkDestroy(() => {
                    afterBulk = true;
                    return Promise.resolve();
                });

                this.User.beforeDestroy(() => {
                    beforeHook = true;
                    return Promise.resolve();
                });

                this.User.afterDestroy(() => {
                    afterHook = true;
                    return Promise.resolve();
                });

                return this.User.bulkCreate([
                    { aNumber: 1 }, { aNumber: 1 }, { aNumber: 1 }
                ]).then(() => {
                    return self.User.destroy({ where: { aNumber: 1 }, individualHooks: true }).then(() => {
                        expect(beforeBulk).to.be.true;
                        expect(afterBulk).to.be.true;
                        expect(beforeHook).to.be.true;
                        expect(afterHook).to.be.true;
                    });
                });
            });

            it("should run the after/before functions for each item created with an error", function () {
                const self = this;
                let beforeBulk = false;
                let afterBulk = false;
                let beforeHook = false;
                let afterHook = false;

                this.User.beforeBulkDestroy(() => {
                    beforeBulk = true;
                    return Promise.resolve();
                });

                this.User.afterBulkDestroy(() => {
                    afterBulk = true;
                    return Promise.resolve();
                });

                this.User.beforeDestroy(() => {
                    beforeHook = true;
                    return Promise.reject(new Error("You shall not pass!"));
                });

                this.User.afterDestroy(() => {
                    afterHook = true;
                    return Promise.resolve();
                });

                return this.User.bulkCreate([{ aNumber: 1 }, { aNumber: 1 }, { aNumber: 1 }], { fields: ["aNumber"] }).then(() => {
                    return self.User.destroy({ where: { aNumber: 1 }, individualHooks: true }).catch((err) => {
                        expect(err).to.be.instanceOf(Error);
                        expect(beforeBulk).to.be.true;
                        expect(beforeHook).to.be.true;
                        expect(afterBulk).to.be.false;
                        expect(afterHook).to.be.false;
                    });
                });
            });
        });
    });

    describe("#bulkRestore", () => {
        beforeEach(async function () {
            await this.ParanoidUser.bulkCreate([
                { username: "adam", mood: "happy" },
                { username: "joe", mood: "sad" }
            ]);
            await this.ParanoidUser.destroy({ truncate: true });
        });

        describe("on success", () => {
            it("should run hooks", function () {
                const beforeBulk = spy();
                const afterBulk = spy();

                this.ParanoidUser.beforeBulkRestore(beforeBulk);
                this.ParanoidUser.afterBulkRestore(afterBulk);

                return this.ParanoidUser.restore({ where: { username: "adam", mood: "happy" } }).then(() => {
                    expect(beforeBulk).to.have.been.calledOnce;
                    expect(afterBulk).to.have.been.calledOnce;
                });
            });
        });

        describe("on error", () => {
            it("should return an error from before", async function () {
                this.ParanoidUser.beforeBulkRestore(() => {
                    throw new Error("Whoops!");
                });

                await assert.throws(async () => {
                    await this.ParanoidUser.restore({ where: { username: "adam", mood: "happy" } });
                });
            });

            it("should return an error from after", async function () {
                this.ParanoidUser.afterBulkRestore(() => {
                    throw new Error("Whoops!");
                });

                await assert.throws(async () => {
                    await this.ParanoidUser.restore({ where: { username: "adam", mood: "happy" } });
                });
            });
        });

        describe("with the {individualHooks: true} option", () => {
            beforeEach(function () {
                this.ParanoidUser = this.sequelize.define("ParanoidUser", {
                    aNumber: {
                        type: type.INTEGER,
                        defaultValue: 0
                    }
                }, {
                    paranoid: true
                });

                return this.ParanoidUser.sync({ force: true });
            });

            it("should run the after/before functions for each item restored successfully", function () {
                const self = this;
                const beforeBulk = spy();
                const afterBulk = spy();
                const beforeHook = spy();
                const afterHook = spy();

                this.ParanoidUser.beforeBulkRestore(beforeBulk);
                this.ParanoidUser.afterBulkRestore(afterBulk);
                this.ParanoidUser.beforeRestore(beforeHook);
                this.ParanoidUser.afterRestore(afterHook);

                return this.ParanoidUser.bulkCreate([
                    { aNumber: 1 }, { aNumber: 1 }, { aNumber: 1 }
                ]).then(() => {
                    return self.ParanoidUser.destroy({ where: { aNumber: 1 } });
                }).then(() => {
                    return self.ParanoidUser.restore({ where: { aNumber: 1 }, individualHooks: true });
                }).then(() => {
                    expect(beforeBulk).to.have.been.calledOnce;
                    expect(afterBulk).to.have.been.calledOnce;
                    expect(beforeHook).to.have.been.calledThrice;
                    expect(afterHook).to.have.been.calledThrice;
                });
            });

            it("should run the after/before functions for each item restored with an error", function () {
                const self = this;
                const beforeBulk = spy();
                const afterBulk = spy();
                const beforeHook = spy();
                const afterHook = spy();

                this.ParanoidUser.beforeBulkRestore(beforeBulk);
                this.ParanoidUser.afterBulkRestore(afterBulk);
                this.ParanoidUser.beforeRestore(() => {
                    beforeHook();
                    return Promise.reject(new Error("You shall not pass!"));
                });

                this.ParanoidUser.afterRestore(afterHook);

                return this.ParanoidUser.bulkCreate([{ aNumber: 1 }, { aNumber: 1 }, { aNumber: 1 }], { fields: ["aNumber"] }).then(() => {
                    return self.ParanoidUser.destroy({ where: { aNumber: 1 } });
                }).then(() => {
                    return self.ParanoidUser.restore({ where: { aNumber: 1 }, individualHooks: true });
                }).catch((err) => {
                    expect(err).to.be.instanceOf(Error);
                    expect(beforeBulk).to.have.been.calledOnce;
                    expect(beforeHook).to.have.been.calledThrice;
                    expect(afterBulk).not.to.have.been.called;
                    expect(afterHook).not.to.have.been.called;
                });
            });
        });
    });
});
