import Support from "../../support";

const current = Support.sequelize;
const { orm } = adone;
const { type } = orm;

describe(Support.getTestDialectTeaser("Instance"), () => {
    describe("decrement", () => {
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
                        _previousDataValues: { id: 3 },
                        dataValues: { id: 1 }
                    })
                );
            });

            after(() => {
                s.restore();
            });

            it("should allow decrements even if options are not given", async () => {
                instance = Model.build({ id: 3 }, { isNewRecord: false });
                await instance.decrement(["id"]);
            });
        });
    });
});
