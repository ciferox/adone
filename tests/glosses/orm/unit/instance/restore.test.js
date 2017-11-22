import Support from "../../support";

const current = Support.sequelize;
const Sequelize = Support.Sequelize;

describe(Support.getTestDialectTeaser("Instance"), () => {
    describe("restore", () => {
        describe("options tests", () => {
            let s;
            let instance;
            const Model = current.define("User", {
                id: {
                    type: Sequelize.BIGINT,
                    primaryKey: true,
                    autoIncrement: true
                },
                deletedAt: {
                    type: Sequelize.DATE
                }
            }, {
                paranoid: true
            });

            before(() => {
                s = stub(current, "query").returns(
                    Sequelize.Promise.resolve([{
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
});
