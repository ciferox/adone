describe("previous", function () {
    const { orm } = adone;
    const { type } = orm;
    const current = this.sequelize;

    it("should return correct previous value", () => {
        const Model = current.define("Model", {
            text: type.STRING,
            textCustom: {
                type: type.STRING,
                set(val) {
                    this.setDataValue("textCustom", val);
                },
                get() {
                    this.getDataValue("textCustom");
                }
            }
        });

        const instance = Model.build({ text: "a", textCustom: "abc" });
        expect(instance.previous("text")).to.be.not.ok;
        expect(instance.previous("textCustom")).to.be.not.ok;

        instance.set("text", "b");
        instance.set("textCustom", "def");

        expect(instance.previous("text")).to.be.equal("a");
        expect(instance.previous("textCustom")).to.be.equal("abc");
    });
});
