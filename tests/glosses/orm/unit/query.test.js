import Support from "../support";

const current = Support.sequelize;

describe("sequelize.query", () => {
    it("connection should be released only once when retry fails", async () => {
        const getConnectionStub = stub(current.connectionManager, "getConnection").callsFake(() => {
            return Promise.resolve({});
        });
        const releaseConnectionStub = stub(current.connectionManager, "releaseConnection").callsFake(() => {
            return Promise.resolve();
        });
        const queryStub = stub(current.dialect.Query.prototype, "run").callsFake(() => {
            return Promise.reject(new Error("wrong sql"));
        });

        await current.query("THIS IS A WRONG SQL", {
            retry: {
                max: 2,
                // retry for all errors
                match: null
            }
        }).catch(() => {});
        expect(releaseConnectionStub).have.been.calledOnce;
        queryStub.restore();
        getConnectionStub.restore();
        releaseConnectionStub.restore();
    });
});
