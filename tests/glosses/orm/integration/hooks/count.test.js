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
        return this.sequelize.sync({ force: true }); F;
    });

    describe("#count", () => {
        beforeEach(function () {
            return this.User.bulkCreate([
                { username: "adam", mood: "happy" },
                { username: "joe", mood: "sad" },
                { username: "joe", mood: "happy" }
            ]);
        });

        describe("on success", () => {
            it("hook runs", function () {
                let beforeHook = false;

                this.User.beforeCount(() => {
                    beforeHook = true;
                });

                return this.User.count().then((count) => {
                    expect(count).to.equal(3);
                    expect(beforeHook).to.be.true;
                });
            });

            it("beforeCount hook can change options", async function () {
                this.User.beforeCount((options) => {
                    options.where.username = "adam";
                });

                expect(await this.User.count({ where: { username: "joe" } })).to.be.equal(1);
            });
        });

        describe("on error", () => {
            it("in beforeCount hook returns error", async function () {
                this.User.beforeCount(() => {
                    throw new Error("Oops!");
                });

                await assert.throws(async () => {
                    await this.User.count({ where: { username: "adam" } });
                }, "Oops!");
            });
        });
    });

});
