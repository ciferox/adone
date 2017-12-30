describe("belongsTo", function () {
    const current = this.sequelize;
    const { AssociationError } = adone.orm;

    it("should throw an AssociationError when two associations have the same alias", () => {
        const User = current.define("User");
        const Task = current.define("Task");

        User.belongsTo(Task, { as: "task" });
        const errorFunction = User.belongsTo.bind(User, Task, { as: "task" });
        const errorMessage = "You have used the alias task in two separate associations. Aliased associations must have unique aliases.";
        expect(errorFunction).to.throw(AssociationError, errorMessage);
    });
});
