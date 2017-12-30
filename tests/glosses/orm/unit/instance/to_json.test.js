describe("toJSON", function () {
    const { orm } = adone;
    const { type } = orm;
    const current = this.sequelize;

    it("returns copy of json", () => {
        const User = current.define("User", {
            name: type.STRING
        });
        const user = User.build({ name: "my-name" });
        const json1 = user.toJSON();
        expect(json1).to.have.property("name").and.be.equal("my-name");

        // remove value from json and ensure it's not changed in the instance
        delete json1.name;

        const json2 = user.toJSON();
        expect(json2).to.have.property("name").and.be.equal("my-name");
    });
});
