import Support from "../../support";

const { orm } = adone;
const { type } = orm;

const current = Support.sequelize;

describe(Support.getTestDialectTeaser("Model"), () => {
    describe("define", () => {
        it("should allow custom timestamps with underscored: true", () => {
            const Model = current.define("User", {}, {
                createdAt: "createdAt",
                updatedAt: "updatedAt",
                timestamps: true,
                underscored: true
            });

            expect(Model.rawAttributes).to.haveOwnProperty("createdAt");
            expect(Model.rawAttributes).to.haveOwnProperty("updatedAt");

            expect(Model._timestampAttributes.createdAt).to.equal("createdAt");
            expect(Model._timestampAttributes.updatedAt).to.equal("updatedAt");

            expect(Model.rawAttributes).not.to.have.property("created_at");
            expect(Model.rawAttributes).not.to.have.property("updated_at");
        });

        it("should throw when id is added but not marked as PK", () => {
            expect(() => {
                current.define("foo", {
                    id: type.INTEGER
                });
            }).to.throw("A column called 'id' was added to the attributes of 'foos' but not marked with 'primaryKey: true'");

            expect(() => {
                current.define("bar", {
                    id: {
                        type: type.INTEGER
                    }
                });
            }).to.throw("A column called 'id' was added to the attributes of 'bars' but not marked with 'primaryKey: true'");
        });
        it('should defend against null or undefined "unique" attributes', () => {
            expect(() => {
                current.define("baz", {
                    foo: {
                        type: type.STRING,
                        unique: null
                    },
                    bar: {
                        type: type.STRING,
                        unique: undefined
                    },
                    bop: {
                        type: type.DATE
                    }
                });
            }).not.to.throw();
        });
    });
});
