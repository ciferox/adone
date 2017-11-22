import Support from "../../support";

const current = Support.sequelize;
const Promise = current.Promise;
const {
    DataTypes
} = adone.orm;
const { vendor: { lodash: _ } } = adone;

describe(Support.getTestDialectTeaser("Model"), () => {

    describe("method destroy", () => {
        const User = current.define("User", {
            name: DataTypes.STRING,
            secretValue: DataTypes.INTEGER
        });

        beforeEach(function () {
            this.deloptions = { where: { secretValue: "1" } };
            this.cloneOptions = _.clone(this.deloptions);
            this.stubDelete = stub(current.getQueryInterface(), "bulkDelete").callsFake(() => {
                return Promise.resolve([]);
            });
        });

        afterEach(function () {
            delete this.deloptions;
            delete this.cloneOptions;
            this.stubDelete.restore();
        });

        it("can detect complexe objects", () => {
            const Where = function () {
                this.secretValue = "1";
            };

            expect(() => {
                User.destroy({ where: new Where() });
            }).to.throw();

        });
    });
});
