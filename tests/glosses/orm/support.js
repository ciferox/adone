const { vendor: { lodash: _ } } = adone;
const is = adone.is;
const { orm } = adone;
const { type } = orm;
const Config = require(`${__dirname}/config/config`);
// const supportShim = require(`${__dirname}/supportShim`);
const AbstractQueryGenerator = adone.private(adone.orm).dialect.abstract.QueryGenerator;

/**
 * Postgres requires postgis extension to be installed
 */

let tmp;

const Support = {
    initTests(options) {
        const sequelize = this.createSequelizeInstance(options);

        this.clearDatabase(sequelize, () => {
            if (options.context) {
                options.context.sequelize = sequelize;
            }

            if (options.beforeComplete) {
                options.beforeComplete(sequelize, type);
            }

            if (options.onComplete) {
                options.onComplete(sequelize, type);
            }
        });
    },

    async prepareTransactionTest(sequelize) {
        const dialect = Support.getTestDialect();

        if (dialect === "sqlite") {
            if (!tmp) {
                tmp = await adone.fs.Directory.createTmp();
            } else {
                await tmp.clean();
            }

            const dbfile = tmp.getFile("db.sqlite");

            const options = _.extend({}, sequelize.options, { storage: dbfile.path() });
            const _sequelize = orm.create(sequelize.config.database, null, null, options);

            await _sequelize.sync({ force: true });

            return _sequelize;
        }

        return sequelize;
    },

    createSequelizeInstance(options) {
        options = options || {};
        options.dialect = this.getTestDialect();

        const config = Config[options.dialect];

        const sequelizeOptions = _.defaults(options, {
            host: options.host || config.host,
            logging: process.env.SEQ_LOG ? console.log : false,
            dialect: options.dialect,
            port: options.port || process.env.SEQ_PORT || config.port,
            pool: config.pool,
            dialectOptions: options.dialectOptions || config.dialectOptions || {}
        });

        if (process.env.DIALECT === "postgres-native") {
            sequelizeOptions.native = true;
        }

        if (config.storage) {
            sequelizeOptions.storage = config.storage;
        }

        return this.getSequelizeInstance(config.database, config.username, config.password, sequelizeOptions);
    },

    getConnectionOptions() {
        const config = Config[this.getTestDialect()];

        delete config.pool;

        return config;
    },

    getSequelizeInstance(db, user, pass, options) {
        options = options || {};
        options.dialect = options.dialect || this.getTestDialect();
        return orm.create(db, user, pass, options);
    },

    clearDatabase(sequelize) {
        return sequelize
            .getQueryInterface()
            .dropAllTables()
            .then(() => {
                sequelize.modelManager.models = [];
                sequelize.models = {};

                return sequelize
                    .getQueryInterface()
                    .dropAllEnums();
            });
    },

    getSupportedDialects() {
        return Object.keys(adone.private(adone.orm).dialect).filter((x) => x !== "abstract");
    },

    checkMatchForDialects(dialect, value, expectations) {
        if (expectations[dialect]) {
            expect(value).to.match(expectations[dialect]);
        } else {
            throw new Error(`Undefined expectation for "${dialect}"!`);
        }
    },

    getAbstractQueryGenerator(sequelize) {
        return Object.assign(
            {},
            AbstractQueryGenerator,
            { options: sequelize.options, _dialect: sequelize.dialect, sequelize, quoteIdentifier(identifier) {
                return identifier;
            } }
        );
    },

    getTestDialect() {
        let envDialect = process.env.DIALECT || "mysql";

        if (envDialect === "postgres-native") {
            envDialect = "postgres";
        }

        if (this.getSupportedDialects().indexOf(envDialect) === -1) {
            throw new Error(`The dialect you have passed is unknown. Did you really mean: ${envDialect}`);
        }

        return envDialect;
    },

    getTestDialectTeaser(moduleName) {
        let dialect = this.getTestDialect();

        if (process.env.DIALECT === "postgres-native") {
            dialect = "postgres-native";
        }

        return `[${dialect.toUpperCase()}] ${moduleName}`;
    },

    getTestUrl(config) {
        let url;
        const dbConfig = config[config.dialect];

        if (config.dialect === "sqlite") {
            url = `sqlite://${dbConfig.storage}`;
        } else {

            let credentials = dbConfig.username;
            if (dbConfig.password) {
                credentials += `:${dbConfig.password}`;
            }

            url = `${config.dialect}://${credentials
            }@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;
        }
        return url;
    },

    expectsql(query, expectations) {
        let expectation = expectations[Support.sequelize.dialect.name];

        if (!expectation) {
            if (!is.undefined(expectations.default)) {
                expectation = expectations.default
                    .replace(/\[/g, Support.sequelize.dialect.TICK_CHAR_LEFT)
                    .replace(/\]/g, Support.sequelize.dialect.TICK_CHAR_RIGHT);
            } else {
                throw new Error(`Undefined expectation for "${Support.sequelize.dialect.name}"!`);
            }
        }

        if (_.isError(query)) {
            expect(query.message).to.equal(expectation.message);
        } else {
            expect(query).to.equal(expectation);
        }
    }
};

before(function () {
    this.sequelize = Support.sequelize;
});

after(async () => {
    if (tmp) {
        await tmp.unlink();
    }
    await Support.sequelize.close();
});

Support.sequelize = Support.createSequelizeInstance();
module.exports = Support;
