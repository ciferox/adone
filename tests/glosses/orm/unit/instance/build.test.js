import Support from "../../support";

const { orm } = adone;
const { type } = orm;
const current = Support.sequelize;

describe(Support.getTestDialectTeaser("Instance"), () => {
    describe("build", () => {
        it("should populate NOW default values", () => {
            const Model = current.define("Model", {
                created_time: {
                    type: type.DATE,
                    allowNull: true,
                    defaultValue: type.NOW
                },
                updated_time: {
                    type: type.DATE,
                    allowNull: true,
                    defaultValue: type.NOW
                },
                ip: {
                    type: type.STRING,
                    validate: {
                        isIP: true
                    }
                },
                ip2: {
                    type: type.STRING,
                    validate: {
                        isIP: {
                            msg: "test"
                        }
                    }
                }
            }, {
                timestamp: false
            });
            const instance = Model.build({ ip: "127.0.0.1", ip2: "0.0.0.0" });

            expect(instance.get("created_time")).to.be.ok();
            expect(instance.get("created_time")).to.be.an.instanceof(Date);

            expect(instance.get("updated_time")).to.be.ok();
            expect(instance.get("updated_time")).to.be.an.instanceof(Date);

            return instance.validate();
        });

        it("should populate explicitly undefined UUID primary keys", () => {
            const Model = current.define("Model", {
                id: {
                    type: type.UUID,
                    primaryKey: true,
                    allowNull: false,
                    defaultValue: type.UUIDV4
                }
            });
            const instance = Model.build({
                id: undefined
            });

            expect(instance.get("id")).not.to.be.undefined();
            expect(instance.get("id")).to.be.ok();
        });

        it("should populate undefined columns with default value", () => {
            const Model = current.define("Model", {
                number1: {
                    type: type.INTEGER,
                    defaultValue: 1
                },
                number2: {
                    type: type.INTEGER,
                    defaultValue: 2
                }
            });
            const instance = Model.build({
                number1: undefined
            });

            expect(instance.get("number1")).not.to.be.undefined();
            expect(instance.get("number1")).to.equal(1);
            expect(instance.get("number2")).not.to.be.undefined();
            expect(instance.get("number2")).to.equal(2);
        });

        it("should clone the default values", () => {
            const Model = current.define("Model", {
                data: {
                    type: type.JSONB,
                    defaultValue: { foo: "bar" }
                }
            });
            const instance = Model.build();
            instance.data.foo = "biz";

            expect(instance.get("data")).to.eql({ foo: "biz" });
            expect(Model.build().get("data")).to.eql({ foo: "bar" });
        });
    });
});
