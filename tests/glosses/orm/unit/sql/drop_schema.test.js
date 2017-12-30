describe("dropSchema", function () {
    const expectsql = this.expectsql;
    const current = this.sequelize;
    const sql = current.dialect.QueryGenerator;

    if (current.dialect.name !== "postgres") {
        return;
    }

    it("IF EXISTS", () => {
        expectsql(sql.dropSchema("foo"), {
            postgres: "DROP SCHEMA IF EXISTS foo CASCADE;"
        });
    });
});