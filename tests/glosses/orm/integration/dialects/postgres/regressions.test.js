describe("Regressions", function () {
    const {
        type
    } = adone.orm;

    it("properly fetch OIDs after sync, #8749", () => {
        const User = this.sequelize.define("User", {
            active: type.BOOLEAN
        });

        /**
         * This Model is important, sync will try to fetch OIDs after each ENUM model sync
         * Having ENUM in this model will force OIDs re-fetch
         * We are testing that OID refresh keep base type intact
         */
        const Media = this.sequelize.define("Media", {
            type: new type.ENUM([
                "image", "video", "audio"
            ])
        });

        User.hasMany(Media);
        Media.belongsTo(User);

        return this.sequelize
            .sync({ force: true })
            .then(() => User.create({ active: true }))
            .then((user) => {
                expect(user.active).to.be.true;
                expect(user.get("active")).to.be.true;

                return User.findOne();
            })
            .then((user) => {
                expect(user.active).to.be.true;
                expect(user.get("active")).to.be.true;

                return User.findOne({ raw: true });
            })
            .then((user) => {
                expect(user.active).to.be.true;
            });
    });
});
