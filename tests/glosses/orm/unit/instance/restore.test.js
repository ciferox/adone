describe("restore", function () {
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
            },
            deletedAt: {
                type: type.DATE
            }
        }, {
            paranoid: true
        });

        before(() => {
            s = stub(current, "query").returns(
                Promise.resolve([{
                    _previousDataValues: { id: 1 },
                    dataValues: { id: 2 }
                }, 1])
            );
        });

        after(() => {
            s.restore();
        });

        it("should allow restores even if options are not given", async () => {
            instance = Model.build({ id: 1 }, { isNewRecord: false });
            await instance.restore();
        });
    });
});
