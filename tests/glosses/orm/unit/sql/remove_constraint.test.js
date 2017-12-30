describe("removeConstraint", function () {
    const current = this.sequelize;
    const expectsql = this.expectsql;
    const sql = current.dialect.QueryGenerator;

    if (!current.dialect.supports.constraints.dropConstraint) {
        return;
    }
    it("naming", () => {
        expectsql(sql.removeConstraintQuery("myTable", "constraint_name"), {
            default: "ALTER TABLE [myTable] DROP CONSTRAINT [constraint_name]"
        });
    });
});
