export default (ctx) => {
    ctx.prefix("integration");

    const dialect = ctx.runtime.getTestDialect();

    ctx.before(function () {
        if (dialect !== "postgres" && dialect !== "postgres-native") {
            return;
        }
        return Promise.all([
            this.sequelize.query("CREATE EXTENSION IF NOT EXISTS hstore", { raw: true }),
            this.sequelize.query("CREATE EXTENSION IF NOT EXISTS btree_gist", { raw: true })
        ]);
    });

    ctx.beforeEach(function () {
        this.sequelize.test.trackRunningQueries();
        return this.clearDatabase(this.sequelize);
    });

    ctx.afterEach(async function () {
        this.sequelize.test.verifyNoRunningQueries();
    });
};
