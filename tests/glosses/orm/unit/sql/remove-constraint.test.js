import Support from "../../support";

const current = Support.sequelize;
const expectsql = Support.expectsql;
const sql = current.dialect.QueryGenerator;

describe(Support.getTestDialectTeaser("SQL"), { skip: !current.dialect.supports.constraints.dropConstraint }, () => {
    describe("removeConstraint", () => {
        it("naming", () => {
            expectsql(sql.removeConstraintQuery("myTable", "constraint_name"), {
                default: "ALTER TABLE [myTable] DROP CONSTRAINT [constraint_name]"
            });
        });
    });
});