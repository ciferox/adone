import Support from "./support";

const { orm } = adone;
const { type } = orm;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser("Model"), { skip: !current.dialect.supports.tmpTableTrigger }, () => {
    describe("trigger", () => {
        let User;
        const triggerQuery = "create trigger User_ChangeTracking on [users] for insert,update, delete \n" +
            "as\n" +
            "SET NOCOUNT ON\n" +
            "if exists(select 1 from inserted)\n" +
            "begin\n" +
            "select * from inserted\n" +
            "end\n" +
            "if exists(select 1 from deleted)\n" +
            "begin\n" +
            "select * from deleted\n" +
            "end\n";

        beforeEach(async function () {
            User = this.sequelize.define("user", {
                username: {
                    type: type.STRING,
                    field: "user_name"
                }
            }, {
                hasTrigger: true
            });

            await User.sync({ force: true });
            await this.sequelize.query(triggerQuery, { type: this.sequelize.queryType.RAW });
        });

        it("should return output rows after insert", async () => {
            await User.create({
                username: "triggertest"
            });
            const res = await User.find({ username: "triggertest" });
            expect(res.username).to.be.equal("triggertest");
        });

        it("should return output rows after instance update", async () => {
            const user = await User.create({
                username: "triggertest"
            });
            user.username = "usernamechanged";
            await user.save();
            const res = await User.find({ username: "usernamechanged" });
            expect(res.username).to.be.equal("usernamechanged");
        });

        it("should return output rows after Model update", async () => {
            const user = await User.create({
                username: "triggertest"
            });
            await User.update({
                username: "usernamechanged"
            }, {
                where: {
                    id: user.get("id")
                }
            });
            const res = await User.find({ username: "usernamechanged" });
            expect(res.username).to.be.equal("usernamechanged");
        });

        it("should successfully delete with a trigger on the table", async () => {
            const user = await User.create({
                username: "triggertest"
            });
            await user.destroy();
            expect(await User.find({ username: "triggertest" })).to.be.null;
        });
    });
});
