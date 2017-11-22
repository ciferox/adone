import Support from "../../support";

const current = Support.sequelize;
const {
    DataTypes
} = adone.orm;
const Promise = Support.Sequelize.Promise;

describe(Support.getTestDialectTeaser("Model"), () => {
    describe("method findOne", () => {
        before(function () {
            this.oldFindAll = current.Model.findAll;
        });
        after(function () {
            current.Model.findAll = this.oldFindAll;
        });

        beforeEach(function () {
            this.stub = current.Model.findAll = stub().returns(Promise.resolve());
        });

        describe("should not add limit when querying on a primary key", () => {
            it("with id primary key", function () {
                const Model = current.define("model");

                return Model.findOne({ where: { id: 42 } }).bind(this).then(function () {
                    expect(this.stub.getCall(0).args[0]).to.be.an("object").not.to.have.property("limit");
                });
            });

            it("with custom primary key", function () {
                const Model = current.define("model", {
                    uid: {
                        type: DataTypes.INTEGER,
                        primaryKey: true,
                        autoIncrement: true
                    }
                });

                return Model.findOne({ where: { uid: 42 } }).bind(this).then(function () {
                    expect(this.stub.getCall(0).args[0]).to.be.an("object").not.to.have.property("limit");
                });
            });

            it("with blob primary key", function () {
                const Model = current.define("model", {
                    id: {
                        type: DataTypes.BLOB,
                        primaryKey: true,
                        autoIncrement: true
                    }
                });

                return Model.findOne({ where: { id: new Buffer("foo") } }).bind(this).then(function () {
                    expect(this.stub.getCall(0).args[0]).to.be.an("object").not.to.have.property("limit");
                });
            });
        });

        it("should add limit when using { $ gt on the primary key", function () {
            const Model = current.define("model");

            return Model.findOne({ where: { id: { $gt: 42 } } }).bind(this).then(function () {
                expect(this.stub.getCall(0).args[0]).to.be.an("object").to.have.property("limit");
            });
        });

    });
});
