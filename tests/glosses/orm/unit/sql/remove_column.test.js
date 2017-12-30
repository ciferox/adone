// Notice: [] will be replaced by dialect specific tick/quote character when there is not dialect specific expectation but only a default expectation
describe("removeColumn", function () {
    const expectsql = this.expectsql;
    const current = this.sequelize;
    const sql = current.dialect.QueryGenerator;

    if (current.dialect.name === "sqlite") {
        return;
    }
    it("schema", () => {
        expectsql(sql.removeColumnQuery({
            schema: "archive",
            tableName: "user"
        }, "email"), {
            mssql: "ALTER TABLE [archive].[user] DROP COLUMN [email];",
            mysql: "ALTER TABLE `archive.user` DROP `email`;",
            postgres: 'ALTER TABLE "archive"."user" DROP COLUMN "email";'
        });
    });
});
