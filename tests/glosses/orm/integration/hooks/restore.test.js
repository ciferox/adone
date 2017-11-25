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

    describe("#restore", () => {
        describe("on success", () => {
            it("should run hooks", function () {
                const beforeHook = spy();
                const afterHook = spy();

                this.ParanoidUser.beforeRestore(beforeHook);
                this.ParanoidUser.afterRestore(afterHook);

                return this.ParanoidUser.create({ username: "Toni", mood: "happy" }).then((user) => {
                    return user.destroy().then(() => {
                        return user.restore().then(() => {
                            expect(beforeHook).to.have.been.calledOnce;
                            expect(afterHook).to.have.been.calledOnce;
                        });
                    });
                });
            });
        });

        describe("on error", () => {
            it("should return an error from before", async function () {
                const beforeHook = spy();
                const afterHook = spy();

                this.ParanoidUser.beforeRestore(() => {
                    beforeHook();
                    throw new Error("Whoops!");
                });
                this.ParanoidUser.afterRestore(afterHook);

                const user = await this.ParanoidUser.create({ username: "Toni", mood: "happy" });
                await user.destroy();

                await assert.throws(async () => {
                    await user.restore();
                });

                expect(beforeHook).to.have.been.calledOnce;
                expect(afterHook).not.to.have.been.called;
            });

            it("should return an error from after", async function () {
                const beforeHook = spy();
                const afterHook = spy();

                this.ParanoidUser.beforeRestore(beforeHook);
                this.ParanoidUser.afterRestore(() => {
                    afterHook();
                    throw new Error("Whoops!");
                });

                const user = await this.ParanoidUser.create({ username: "Toni", mood: "happy" });
                await user.destroy();
                await assert.throws(async () => {
                    await user.restore();
                });
                expect(beforeHook).to.have.been.calledOnce;
                expect(afterHook).to.have.been.calledOnce;
            });
        });
    });
});
