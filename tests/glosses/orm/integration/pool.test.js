import Support from "./support";

const dialect = Support.getTestDialect();
const Sequelize = Support.Sequelize;

describe(Support.getTestDialectTeaser("Pooling"), { skip: dialect === "sqlite" }, function () {
    beforeEach(() => {
        this.sinon = adone.shani.util.sandbox.create();
    });

    afterEach(() => {
        this.sinon.restore();
    });

    it("should reject when unable to acquire connection in given time", async () => {
        this.testInstance = new Sequelize("localhost", "ffd", "dfdf", {
            dialect,
            databaseVersion: "1.2.3",
            pool: {
                acquire: 1000 //milliseconds
            }
        });

        this.sinon.stub(this.testInstance.connectionManager, "_connect").callsFake(() => new Sequelize.Promise(() => { }));

        await assert.throws(async () => {
            await this.testInstance.authenticate();
        }, "ResourceRequest timed out");
    });
});
