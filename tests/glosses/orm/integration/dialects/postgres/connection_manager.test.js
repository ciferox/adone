describe("Connection manager", function () {
    const { orm, vendor: { lodash: _ } } = adone;
    const { type } = orm;
    const checkTimezoneParsing = (baseOptions) => {
        const options = _.extend({}, baseOptions, { timezone: "Asia/Kolkata", timestamps: true });
        const sequelize = this.createSequelizeInstance(options);

        const tzTable = sequelize.define("tz_table", { foo: type.STRING });
        return tzTable.sync({ force: true }).then(() => {
            return tzTable.create({ foo: "test" }).then((row) => {
                expect(row).to.be.not.null;
            });
        });
    };

    it("should correctly parse the moment based timezone", function () {
        return checkTimezoneParsing(this.sequelize.options);
    });

    it("should correctly parse the moment based timezone while fetching hstore oids", function () {
        // reset oids so we need to refetch them
        type.HSTORE.types.postgres.oids = [];
        type.HSTORE.types.postgres.array_oids = [];
        return checkTimezoneParsing(this.sequelize.options);
    });
});
