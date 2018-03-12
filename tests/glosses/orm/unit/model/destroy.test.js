describe("destroy", function () {
    const current = this.sequelize;
    const { orm, lodash: _ } = adone;
    const { type } = orm;

    const User = current.define("User", {
        name: type.STRING,
        secretValue: type.INTEGER
    });

    beforeEach(function () {
        this.deloptions = { where: { secretValue: "1" } };
        this.cloneOptions = _.clone(this.deloptions);
        this.stubDelete = stub(current.getQueryInterface(), "bulkDelete").callsFake(() => {
            return Promise.resolve([]);
        });
    });

    afterEach(function () {
        delete this.deloptions;
        delete this.cloneOptions;
        this.stubDelete.restore();
    });

    it("can detect complex objects", async () => {
        const Where = function () {
            this.secretValue = "1";
        };

        await assert.throws(async () => {
            await User.destroy({ where: new Where() });
        });
    });
});
