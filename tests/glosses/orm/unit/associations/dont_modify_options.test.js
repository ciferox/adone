import Support from "../../support";

const { orm } = adone;
const { type } = orm;

describe(Support.getTestDialectTeaser("associations"), () => {
    describe("Test options.foreignKey", () => {
        beforeEach(function () {

            this.A = this.sequelize.define("A", {
                id: {
                    type: new type.CHAR(20),
                    primaryKey: true
                }
            });
            this.B = this.sequelize.define("B", {
                id: {
                    type: new type.CHAR(20),
                    primaryKey: true
                }
            });
            this.C = this.sequelize.define("C", {});
        });

        it("should not be overwritten for belongsTo", function () {
            const reqValidForeignKey = { foreignKey: { allowNull: false } };
            this.A.belongsTo(this.B, reqValidForeignKey);
            this.A.belongsTo(this.C, reqValidForeignKey);
            expect(this.A.rawAttributes.CId.type).to.deep.equal(this.C.rawAttributes.id.type);
        });
        it("should not be overwritten for belongsToMany", function () {
            const reqValidForeignKey = { foreignKey: { allowNull: false }, through: "ABBridge" };
            this.B.belongsToMany(this.A, reqValidForeignKey);
            this.A.belongsTo(this.C, reqValidForeignKey);
            expect(this.A.rawAttributes.CId.type).to.deep.equal(this.C.rawAttributes.id.type);
        });
        it("should not be overwritten for hasOne", function () {
            const reqValidForeignKey = { foreignKey: { allowNull: false } };
            this.B.hasOne(this.A, reqValidForeignKey);
            this.A.belongsTo(this.C, reqValidForeignKey);
            expect(this.A.rawAttributes.CId.type).to.deep.equal(this.C.rawAttributes.id.type);
        });
        it("should not be overwritten for hasMany", function () {
            const reqValidForeignKey = { foreignKey: { allowNull: false } };
            this.B.hasMany(this.A, reqValidForeignKey);
            this.A.belongsTo(this.C, reqValidForeignKey);
            expect(this.A.rawAttributes.CId.type).to.deep.equal(this.C.rawAttributes.id.type);
        });
    });
});
