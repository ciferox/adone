import Support from "../../support";


const expectsql = Support.expectsql;
const current = Support.sequelize;
const sql = current.dialect.QueryGenerator;

// Notice: [] will be replaced by dialect specific tick/quote character when there is not dialect specific expectation but only a default expectation

describe(Support.getTestDialectTeaser("SQL"), { skip: current.dialect.name === "sqlite" }, () => {
    describe("removeColumn", () => {
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
});
