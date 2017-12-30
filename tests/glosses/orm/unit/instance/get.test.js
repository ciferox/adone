describe("get", function () {
    const { orm } = adone;
    const { type } = orm;
    const current = this.sequelize;

    beforeEach(function () {
        this.getSpy = spy();
        this.User = current.define("User", {
            name: {
                type: type.STRING,
                get: this.getSpy
            }
        });
    });

    it("invokes getter if raw: false", function () {
        this.User.build().get("name");

        expect(this.getSpy).to.have.been.called;
    });

    it("does not invoke getter if raw: true", function () {
        expect(this.getSpy, { raw: true }).not.to.have.been.called;
    });
});
