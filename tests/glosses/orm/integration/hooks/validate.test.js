describe("validate", () => {
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

    describe("#create", () => {
        it("should return the user", function () {
            this.User.beforeValidate((user) => {
                user.username = "Bob";
                user.mood = "happy";
            });

            this.User.afterValidate((user) => {
                user.username = "Toni";
            });

            return this.User.create({ mood: "ecstatic" }).then((user) => {
                expect(user.mood).to.equal("happy");
                expect(user.username).to.equal("Toni");
            });
        });
    });

    describe("#3534, hooks modifications", () => {
        it("fields modified in hooks are saved", function () {
            const self = this;

            this.User.afterValidate((user) => {
                //if username is defined and has more than 5 char
                user.username = user.username
                    ? user.username.length < 5 ? null : user.username
                    : null;
                user.username = user.username || "Samorost 3";

            });

            this.User.beforeValidate((user) => {
                user.mood = user.mood || "neutral";
            });


            return this.User.create({ username: "T", mood: "neutral" }).then((user) => {
                expect(user.mood).to.equal("neutral");
                expect(user.username).to.equal("Samorost 3");

                //change attributes
                user.mood = "sad";
                user.username = "Samorost Good One";

                return user.save();
            }).then((uSaved) => {
                expect(uSaved.mood).to.equal("sad");
                expect(uSaved.username).to.equal("Samorost Good One");

                //change attributes, expect to be replaced by hooks
                uSaved.username = "One";

                return uSaved.save();
            }).then((uSaved) => {
                //attributes were replaced by hooks ?
                expect(uSaved.mood).to.equal("sad");
                expect(uSaved.username).to.equal("Samorost 3");
                return self.User.findById(uSaved.id);
            }).then((uFetched) => {
                expect(uFetched.mood).to.equal("sad");
                expect(uFetched.username).to.equal("Samorost 3");

                uFetched.mood = null;
                uFetched.username = "New Game is Needed";

                return uFetched.save();
            }).then((uFetchedSaved) => {
                expect(uFetchedSaved.mood).to.equal("neutral");
                expect(uFetchedSaved.username).to.equal("New Game is Needed");

                return self.User.findById(uFetchedSaved.id);
            }).then((uFetched) => {
                expect(uFetched.mood).to.equal("neutral");
                expect(uFetched.username).to.equal("New Game is Needed");

                //expect to be replaced by hooks
                uFetched.username = "New";
                uFetched.mood = "happy";
                return uFetched.save();
            }).then((uFetchedSaved) => {
                expect(uFetchedSaved.mood).to.equal("happy");
                expect(uFetchedSaved.username).to.equal("Samorost 3");
            });
        });
    });

    describe("on error", () => {
        it("should emit an error from after hook", async function () {
            this.User.afterValidate((user) => {
                user.mood = "ecstatic";
                throw new Error("Whoops! Changed user.mood!");
            });

            await assert.throws(async () => {
                await this.User.create({ username: "Toni", mood: "happy" });
            }, "Whoops! Changed user.mood!");
        });

        it("should call validationFailed hook", async function () {
            const validationFailedHook = spy();

            this.User.validationFailed(validationFailedHook);

            await assert.throws(async () => {
                await this.User.create({ mood: "happy" });
            });
            expect(validationFailedHook).to.have.been.calledOnce();
        });

        it("should not replace the validation error in validationFailed hook by default", async function () {
            const validationFailedHook = stub();

            this.User.validationFailed(validationFailedHook);

            const err = await assert.throws(async () => {
                await this.User.create({ mood: "happy" });
            });

            expect(err.name).to.equal("ValidationError");
        });

        it("should replace the validation error if validationFailed hook creates a new error", async function () {
            const validationFailedHook = stub().throws(new Error("Whoops!"));

            this.User.validationFailed(validationFailedHook);

            await assert.throws(async () => {
                await this.User.create({ mood: "happy" });
            }, "Whoops!");
        });
    });
});
