describe("query", function () {
    it("connection should be released only once when retry fails", async () => {
        const getConnectionStub = stub(this.sequelize.connectionManager, "getConnection").callsFake(() => {
            return Promise.resolve({});
        });
        const releaseConnectionStub = stub(this.sequelize.connectionManager, "releaseConnection").callsFake(() => {
            return Promise.resolve();
        });
        const queryStub = stub(this.sequelize.dialect.Query.prototype, "run").callsFake(() => {
            return Promise.reject(new Error("wrong sql"));
        });

        await this.sequelize.query("THIS IS A WRONG SQL", {
            retry: {
                max: 2,
                // retry for all errors
                match: null
            }
        }).catch(() => {});
        expect(releaseConnectionStub).have.been.calledOnce();
        queryStub.restore();
        getConnectionStub.restore();
        releaseConnectionStub.restore();
    });
});
