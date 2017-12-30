describe("isSoftDeleted", function () {
    const current = this.sequelize;
    const { orm } = adone;
    const { type } = orm;

    beforeEach(function () {
        const User = current.define("User", {
            name: type.STRING,
            birthdate: type.DATE,
            meta: type.JSON,
            deletedAt: {
                type: type.DATE
            }
        });

        const ParanoidUser = current.define("User", {
            name: type.STRING,
            birthdate: type.DATE,
            meta: type.JSON,
            deletedAt: {
                type: type.DATE
            }
        }, {
            paranoid: true
        });

        this.paranoidUser = ParanoidUser.build({
            name: "a"
        }, {
            isNewRecord: false,
            raw: true
        });

        this.user = User.build({
            name: "a"
        }, {
            isNewRecord: false,
            raw: true
        });
    });

    it("should not throw if paranoid is set to true", function () {
        expect(() => {
            this.paranoidUser.isSoftDeleted();
        }).to.not.throw();
    });

    it("should throw if paranoid is set to false", function () {
        expect(() => {
            this.user.isSoftDeleted();
        }).to.throw("Model is not paranoid");
    });

    it("should return false if the soft-delete property is the same as " +
      "the default value", function () {
        this.paranoidUser.setDataValue("deletedAt", null);
        expect(this.paranoidUser.isSoftDeleted()).to.be.false();
    });

    it("should return false if the soft-delete property is set to a date in " +
      "the future", function () {
        this.paranoidUser.setDataValue("deletedAt", adone.datetime().add(5, "days").format());
        expect(this.paranoidUser.isSoftDeleted()).to.be.false();
    });

    it("should return true if the soft-delete property is set to a date " +
      "before now", function () {
        this.paranoidUser.setDataValue("deletedAt", adone.datetime().subtract(5, "days").format());
        expect(this.paranoidUser.isSoftDeleted()).to.be.true();
    });
});
