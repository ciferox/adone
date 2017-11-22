import Support from "../../support";

const current = Support.sequelize;
const cls = require("continuation-local-storage");
const Promise = Support.Sequelize.Promise;

describe(Support.getTestDialectTeaser("Model"), () => {

    describe("method findOrCreate", () => {

        before(() => {
            current.constructor.useCLS(cls.createNamespace("sequelize")); 4;
        });

        after(() => {
            delete current.constructor._cls;
        });

        beforeEach(function () {
            this.User = current.define("User", {}, {
                name: "John"
            });

            this.transactionStub = stub(this.User.sequelize, "transaction");
            this.transactionStub.returns(new Promise(() => { }));

            this.clsStub = stub(current.constructor._cls, "get");
            this.clsStub.returns({ id: 123 });
        });

        afterEach(function () {
            this.transactionStub.restore();
            this.clsStub.restore();
        });

        it("should use transaction from cls if available", function () {

            const options = {
                where: {
                    name: "John"
                }
            };

            this.User.findOrCreate(options);

            expect(this.clsStub.calledOnce).to.equal(true, "expected to ask for transaction");
        });

        it("should not use transaction from cls if provided as argument", function () {

            const options = {
                where: {
                    name: "John"
                },
                transaction: { id: 123 }
            };

            this.User.findOrCreate(options);

            expect(this.clsStub.called).to.equal(false);
        });
    });
});
