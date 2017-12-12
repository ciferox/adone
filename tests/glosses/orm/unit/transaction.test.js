import Support from "../support";

const Sequelize = Support.Sequelize;
const dialect = Support.getTestDialect();
const current = Support.sequelize;

describe("Transaction", function () {
    beforeEach(() => {
        this.stub = stub(current, "query").returns(Promise.resolve({}));

        this.stubConnection = stub(current.connectionManager, "getConnection")
            .returns(Promise.resolve({
                uuid: "ssfdjd-434fd-43dfg23-2d",
                close() { }
            }));

        this.stubRelease = stub(current.connectionManager, "releaseConnection")
            .returns(Promise.resolve());
    });

    afterEach(() => {
        this.stub.restore();
        this.stubConnection.restore();
        this.stubRelease.restore();
    });

    it("should run auto commit query only when needed", () => {
        const expectations = {
            all: [
                "START TRANSACTION;"
            ],
            sqlite: [
                "BEGIN DEFERRED TRANSACTION;"
            ],
            mssql: [
                "BEGIN TRANSACTION;"
            ]
        };
        return current.transaction(() => {
            expect(this.stub.args.map((arg) => arg[0])).to.deep.equal(expectations[dialect] || expectations.all);
            return Promise.resolve();
        });
    });
});