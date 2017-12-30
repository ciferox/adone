describe("destroy", () => {
    const { orm } = adone;
    const { type } = orm;

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
        return this.sequelize.sync({ force: true });
    });

    describe("on success", () => {
        it("should run hooks", function () {
            const beforeHook = spy();
            const afterHook = spy();

            this.User.beforeDestroy(beforeHook);
            this.User.afterDestroy(afterHook);

            return this.User.create({ username: "Toni", mood: "happy" }).then((user) => {
                return user.destroy().then(() => {
                    expect(beforeHook).to.have.been.calledOnce;
                    expect(afterHook).to.have.been.calledOnce;
                });
            });
        });
    });

    describe("on error", () => {
        it("should return an error from before", async function () {
            const beforeHook = spy();
            const afterHook = spy();

            this.User.beforeDestroy(() => {
                beforeHook();
                throw new Error("Whoops!");
            });
            this.User.afterDestroy(afterHook);

            const user = await this.User.create({ username: "Toni", mood: "happy" });

            await assert.throws(async () => {
                await user.destroy();
            });

            expect(beforeHook).to.have.been.calledOnce;
            expect(afterHook).not.to.have.been.called;
        });

        it("should return an error from after", async function () {
            const beforeHook = spy();
            const afterHook = spy();

            this.User.beforeDestroy(beforeHook);
            this.User.afterDestroy(() => {
                afterHook();
                throw new Error("Whoops!");
            });

            const user = await this.User.create({ username: "Toni", mood: "happy" });

            await assert.throws(async () => {
                await user.destroy();
            });

            expect(beforeHook).to.have.been.calledOnce;
            expect(afterHook).to.have.been.calledOnce;
        });
    });
});
