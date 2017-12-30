describe("count", function () {
    const current = this.sequelize;
    const { orm } = adone;
    const { type } = orm;
    const __ = adone.private(orm);

    before(() => {
        this.oldFindAll = __.Model.findAll;
        this.oldAggregate = __.Model.aggregate;

        __.Model.findAll = stub().returns(Promise.resolve());

        this.User = current.define("User", {
            username: type.STRING,
            age: type.INTEGER
        });
        this.Project = current.define("Project", {
            name: type.STRING
        });

        this.User.hasMany(this.Project);
        this.Project.belongsTo(this.User);
    });

    after(() => {
        __.Model.findAll = this.oldFindAll;
        __.Model.aggregate = this.oldAggregate;
    });

    beforeEach(() => {
        this.stub = __.Model.aggregate = stub().returns(Promise.resolve());
    });

    describe("should pass the same options to model.aggregate as findAndCount", () => {
        it("with includes", () => {
            const queryObject = {
                include: [this.Project]
            };
            return this.User.count(queryObject)
                .then(() => this.User.findAndCount(queryObject))
                .then(() => {
                    const count = this.stub.getCall(0).args;
                    const findAndCount = this.stub.getCall(1).args;
                    expect(count).to.eql(findAndCount);
                });
        });

        it("attributes should be stripped in case of findAndCount", () => {
            const queryObject = {
                attributes: ["username"]
            };
            return this.User.count(queryObject)
                .then(() => this.User.findAndCount(queryObject))
                .then(() => {
                    const count = this.stub.getCall(0).args;
                    const findAndCount = this.stub.getCall(1).args;
                    expect(count).not.to.eql(findAndCount);
                    count[2].attributes = undefined;
                    expect(count).to.eql(findAndCount);
                });
        });
    });

});
