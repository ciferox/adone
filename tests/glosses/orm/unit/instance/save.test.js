describe("save", function () {
    const current = this.sequelize;
    const { orm } = adone;
    const { type } = orm;

    it("should disallow saves if no primary key values is present", async () => {
        const Model = current.define("User", {

        });
        const instance = Model.build({}, { isNewRecord: false });

        await assert.throws(async () => {
            await instance.save();
        });
    });

    describe("options tests", () => {
        let s;
        let instance;
        const Model = current.define("User", {
            id: {
                type: type.BIGINT,
                primaryKey: true,
                autoIncrement: true
            }
        });

        before(() => {
            s = stub(current, "query").returns(
                Promise.resolve([{
                    _previousDataValues: {},
                    dataValues: { id: 1 }
                }, 1])
            );
        });

        after(() => {
            s.restore();
        });

        it("should allow saves even if options are not given", async () => {
            instance = Model.build({});
            await instance.save();
        });
    });
});
