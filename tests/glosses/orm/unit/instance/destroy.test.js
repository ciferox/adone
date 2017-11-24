import Support from "../../support";

const current = Support.sequelize;
const Sequelize = Support.Sequelize;

describe(Support.getTestDialectTeaser("Instance"), () => {
    describe("destroy", () => {
        describe("options tests", () => {
            let s;
            let instance;
            const Model = current.define("User", {
                id: {
                    type: Sequelize.BIGINT,
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
});
