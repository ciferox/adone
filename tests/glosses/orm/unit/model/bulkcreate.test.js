describe("bulkCreate", function () {
    const { orm } = adone;
    const { type } = orm;

    const current = this.sequelize;

    beforeEach(function () {
        this.Model = current.define("model", {
            accountId: {
                type: new type.INTEGER(11).UNSIGNED,
                allowNull: false,
                field: "account_id"
            }
        }, { timestamps: false });
        this.stub = stub(current.getQueryInterface(), "bulkInsert").callsFake(() => {
            return Promise.resolve([]);
        });
    });

    afterEach(function () {
        this.stub.restore();
    });

    describe("validations", () => {
        it("should not fail for renamed fields", async function () {
            await this.Model.bulkCreate([
                { accountId: 42 }
            ], { validate: true });
            expect(this.stub.getCall(0).args[1]).to.deep.equal([
                { account_id: 42, id: null }
            ]);
        });
    });
});
