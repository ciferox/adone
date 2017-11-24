import Support from "../../support";

const current = Support.sequelize;
const { vendor: { lodash: _ } } = adone;
const { DataTypes } = adone.orm;

describe(Support.getTestDialectTeaser("Model"), () => {

    describe("method update", () => {
        const User = current.define("User", {
            name: DataTypes.STRING,
            secretValue: DataTypes.INTEGER
        });

        beforeEach(function () {
            this.updates = { name: "Batman", secretValue: "7" };
            this.cloneUpdates = _.clone(this.updates);
            this.stubUpdate = stub(current.getQueryInterface(), "bulkUpdate").callsFake(() => {
                return Promise.resolve([]);
            });
        });

        afterEach(function () {
            delete this.updates;
            delete this.cloneUpdates;
            this.stubUpdate.restore();
        });

        describe("properly clones input values", () => {
            it("with default options", async function () {
                const self = this;
                await User.update(self.updates, { where: { secretValue: "1" } });
                expect(self.updates).to.be.deep.eql(self.cloneUpdates);
            });

            it("when using fields option", async function () {
                const self = this;
                await User.update(self.updates, { where: { secretValue: "1" }, fields: ["name"] });
                expect(self.updates).to.be.deep.eql(self.cloneUpdates);
            });
        });

        it("can detect complexe objects", async function () {
            const self = this;
            const Where = function () {
                this.secretValue = "1";
            };

            await assert.throws(async () => {
                await User.update(self.updates, { where: new Where() });
            });
        });
    });
});
