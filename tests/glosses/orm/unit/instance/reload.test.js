import Support from "../../support";

const current = Support.sequelize;
const { orm } = adone;
const { type } = orm;

describe(Support.getTestDialectTeaser("Instance"), () => {
    describe("reload", () => {
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
                    Promise.resolve({
                        _previousDataValues: { id: 1 },
                        dataValues: { id: 2 }
                    })
                );
            });

            after(() => {
                s.restore();
            });

            it("should allow reloads even if options are not given", async () => {
                instance = Model.build({ id: 1 }, { isNewRecord: false });
                await instance.reload();
            });
        });
    });
});
