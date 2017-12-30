describe("increment", function () {
    const { orm } = adone;
    const { type } = orm;

    describe("options tests", () => {
        const Model = this.sequelize.define("User", {
            id: {
                type: type.BIGINT,
                primaryKey: true,
                autoIncrement: true
            },
            count: type.BIGINT
        });

        it("should reject if options are missing", async () => {
            await assert.throws(async () => {
                await Model.increment(["id", "count"]);
            }, "Missing where attribute in the options parameter");
        });

        it("should reject if options.where are missing", async () => {
            await assert.throws(async () => {
                await Model.increment(["id", "count"], { by: 10 });
            }, "Missing where attribute in the options parameter");
        });
    });
});
