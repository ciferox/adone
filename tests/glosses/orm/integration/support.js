const Support = require("../support");
const dialect = Support.getTestDialect();

before(() => {
    if (dialect !== "postgres" && dialect !== "postgres-native") {
        return;
    }
    return Promise.all([
        Support.sequelize.query("CREATE EXTENSION IF NOT EXISTS hstore", { raw: true }),
        Support.sequelize.query("CREATE EXTENSION IF NOT EXISTS btree_gist", { raw: true })
    ]);
});

beforeEach(function () {
    this.sequelize.test.trackRunningQueries();
    return Support.clearDatabase(this.sequelize);
});

afterEach(async function () {
    this.sequelize.test.verifyNoRunningQueries();
});

module.exports = Support;
