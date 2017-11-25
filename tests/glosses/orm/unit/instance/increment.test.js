import Support from "../../support";

const current = Support.sequelize;
const { orm } = adone;
const { type } = orm;

describe(Support.getTestDialectTeaser("Instance"), () => {
    describe("increment", () => {
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
                        _previousDataValues: { id: 1 },
                        dataValues: { id: 3 }
                    })
                );
            });

            after(() => {
                s.restore();
            });

            it("should allow increments even if options are not given", async () => {
                instance = Model.build({ id: 1 }, { isNewRecord: false });
                await instance.increment(["id"]);
            });
        });
    });
});
