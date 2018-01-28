describe("findAndCountAll", function () {
    const current = this.sequelize;
    const { orm } = adone;
    const { type } = orm;

    describe("should handle promise rejection", () => {
        before(function () {
            this.stub = stub();

            this.User = current.define("User", {
                username: type.STRING,
                age: type.INTEGER
            });

            this.findAll = stub(this.User, "findAll").callsFake(() => {
                return Promise.reject(new Error());
            });

            this.count = stub(this.User, "count").callsFake(() => {
                return Promise.reject(new Error());
            });
        });

        after(function () {
            this.findAll.resetBehavior();
            this.count.resetBehavior();
        });

        it("with errors in count and findAll both", function () {
            return this.User.findAndCount({})
                .then(() => {
                    throw new Error();
                })
                .catch(() => {
                    expect(this.stub.callCount).to.eql(0);
                });
        });
    });
});
