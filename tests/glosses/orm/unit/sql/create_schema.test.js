describe("createSchema", function () {
    const expectsql = this.expectsql;
    const current = this.sequelize;
    const sql = current.dialect.QueryGenerator;

    if (current.dialect.name !== "postgres") {
        return;
    }

    before(function () {
        this.version = current.options.databaseVersion;
    });

    after(function () {
        current.options.databaseVersion = this.version;
    });

    it("9.2.0 or above", () => {
        current.options.databaseVersion = "9.2.0";
        expectsql(sql.createSchema("foo"), {
            postgres: "CREATE SCHEMA IF NOT EXISTS foo;"
        });
    });

    it("below 9.2.0", () => {
        current.options.databaseVersion = "9.0.0";
        expectsql(sql.createSchema("foo"), {
            postgres: "CREATE SCHEMA foo;"
        });
    });
});
