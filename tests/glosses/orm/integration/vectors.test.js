describe("vectors", () => {
    const { orm } = adone;
    const { type } = orm;

    it("should not allow insert backslash", function () {
        const Student = this.sequelize.define("student", {
            name: type.STRING
        }, {
            tableName: "student"
        });

        return Student.sync({ force: true }).then(() => {
            return Student.create({
                name: 'Robert\\\'); DROP TABLE "students"; --'
            }).then((result) => {
                expect(result.get("name")).to.equal('Robert\\\'); DROP TABLE "students"; --');
                return Student.findAll();
            }).then((result) => {
                expect(result[0].name).to.equal('Robert\\\'); DROP TABLE "students"; --');
            });
        });
    });
});
