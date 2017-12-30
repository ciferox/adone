describe("destroy", function () {
    const current = this.sequelize;
    const { orm } = adone;
    const { type } = orm;

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
                Promise.resolve({
                    _previousDataValues: {},
                    dataValues: { id: 1 }
                })
            );
        });

        after(() => {
            s.restore();
        });

        it("should allow destroies even if options are not given", async () => {
            instance = Model.build({ id: 1 }, { isNewRecord: false });
            await instance.destroy();
        });
    });
});
