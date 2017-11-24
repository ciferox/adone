import Support from "../../support";

const {
    DataTypes
} = adone.orm;

const current = Support.sequelize;

describe(Support.getTestDialectTeaser("Model"), () => {
    describe("bulkCreate", () => {
        const Model = current.define("model", {
            accountId: {
                type: new DataTypes.INTEGER(11).UNSIGNED,
                allowNull: false,
                field: "account_id"
            }
        }, { timestamps: false });

        beforeEach(function () {
            this.stub = stub(current.getQueryInterface(), "bulkInsert").callsFake(() => {
                return Promise.resolve([]);
            });
        });

        afterEach(function () {
            this.stub.restore();
        });

        describe("validations", () => {
            it("should not fail for renamed fields", async function () {
                await Model.bulkCreate([
                    { accountId: 42 }
                ], { validate: true });
                expect(this.stub.getCall(0).args[1]).to.deep.equal([
                    { account_id: 42, id: null }
                ]);
            });
        });
    });
});
