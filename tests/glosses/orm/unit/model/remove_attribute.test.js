describe("removeAttribute", function () {
    const current = this.sequelize;
    const { lodash: _ } = adone;
    const { orm } = adone;
    const { type } = orm;

    it("should support removing the primary key", () => {
        const Model = current.define("m", {
            name: type.STRING
        });

        expect(Model.primaryKeyAttribute).not.to.be.undefined();
        expect(_.size(Model.primaryKeys)).to.equal(1);

        Model.removeAttribute("id");

        expect(Model.primaryKeyAttribute).to.be.undefined();
        expect(_.size(Model.primaryKeys)).to.equal(0);
    });

    it("should not add undefined attribute after removing primary key", () => {
        const Model = current.define("m", {
            name: type.STRING
        });

        Model.removeAttribute("id");

        const instance = Model.build();
        expect(instance.dataValues).not.to.include.keys("undefined");
    });
});
