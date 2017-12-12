import Support from "../../support";

const { orm } = adone;
const { type } = orm;

describe(Support.getTestDialectTeaser("Model"), () => {

    describe("not breaking built-ins", () => {
        it("it should not break instance.set by defining a model set attribute", function () {
            const User = this.sequelize.define("OverWrittenKeys", {
                set: type.STRING
            });

            const user = User.build({ set: "A" });
            expect(user.get("set")).to.equal("A");
            user.set("set", "B");
            expect(user.get("set")).to.equal("B");
        });
    });
});