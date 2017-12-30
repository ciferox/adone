describe("query", function () {
    const { Query } = adone.private(adone.orm).dialect.mssql;
    const sequelize = this.sequelize;
    const tedious = require("tedious");
    const tediousIsolationLevel = tedious.ISOLATION_LEVEL;
    const connectionStub = { beginTransaction: () => { }, lib: tedious };

    let sandbox;
    let query;

    describe("beginTransaction", () => {
        beforeEach(() => {
            sandbox = adone.shani.util.sandbox.create();
            const options = {
                transaction: { name: "transactionName" },
                isolationLevel: "REPEATABLE_READ",
                logging: false
            };
            sandbox.stub(connectionStub, "beginTransaction").callsFake((cb) => {
                cb();
            });
            query = new Query(connectionStub, sequelize, options);
        });

        it("should call beginTransaction with correct arguments", () => {
            return query._run(connectionStub, "BEGIN TRANSACTION")
                .then(() => {
                    expect(connectionStub.beginTransaction.called).to.equal(true);
                    expect(connectionStub.beginTransaction.args[0][1]).to.equal("transactionName");
                    expect(connectionStub.beginTransaction.args[0][2]).to.equal(tediousIsolationLevel.REPEATABLE_READ);
                });
        });

        afterEach(() => {
            sandbox.restore();
        });
    });
});
