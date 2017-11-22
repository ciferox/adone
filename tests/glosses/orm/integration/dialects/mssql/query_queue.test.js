import Support from "../../support";

const { Promise, DataTypes } = adone.orm;
const dialect = Support.getTestDialect();

describe("[MSSQL Specific] Query Queue", { skip: !/^mssql/.test(dialect) }, () => {
    beforeEach(function () {
        const User = this.User = this.sequelize.define("User", {
            username: DataTypes.STRING
        });

        return this.sequelize.sync({ force: true }).then(() => {
            return User.create({ username: "John" });
        });
    });

    it("should queue concurrent requests to a connection", async function () {
        const User = this.User;

        await this.sequelize.transaction((t) => {
            return Promise.all([
                User.findOne({
                    transaction: t
                }),
                User.findOne({
                    transaction: t
                })
            ]);
        });
    });
});
