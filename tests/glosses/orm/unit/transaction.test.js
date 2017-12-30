describe("transaction", function () {
    beforeEach(() => {
        this.stub = stub(this.sequelize, "query").returns(Promise.resolve({}));

        this.stubConnection = stub(this.sequelize.connectionManager, "getConnection")
            .returns(Promise.resolve({
                uuid: "ssfdjd-434fd-43dfg23-2d",
                close() { }
            }));

        this.stubRelease = stub(this.sequelize.connectionManager, "releaseConnection")
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
        return this.sequelize.transaction(() => {
            expect(this.stub.args.map((arg) => arg[0])).to.deep.equal(expectations[this.getTestDialect()] || expectations.all);
            return Promise.resolve();
        });
    });
});
