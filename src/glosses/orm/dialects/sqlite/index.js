const { vendor: { lodash: _ } } = adone;
const AbstractDialect = require("../abstract");
const ConnectionManager = require("./connection_manager");
const Query = require("./query");
const QueryGenerator = require("./query_generator");
const DataTypes = require("../../data_types").sqlite;

class SqliteDialect extends AbstractDialect {
    constructor(sequelize) {
        super();
        this.sequelize = sequelize;
        this.connectionManager = new ConnectionManager(this, sequelize);
        this.QueryGenerator = _.extend({}, QueryGenerator, {
            options: sequelize.options,
            _dialect: this,
            sequelize
        });
    }
}

SqliteDialect.prototype.supports = _.merge(_.cloneDeep(AbstractDialect.prototype.supports), {
    DEFAULT: false,
    "DEFAULT VALUES": true,
    "UNION ALL": false,
    IGNORE: " OR IGNORE",
    index: {
        using: false,
        where: true
    },
    transactionOptions: {
        type: true,
        autocommit: false
    },
    constraints: {
        addConstraint: false,
        dropConstraint: false
    },
    joinTableDependent: false,
    groupedLimit: false,
    ignoreDuplicates: " OR IGNORE",
    JSON: true
});

ConnectionManager.prototype.defaultVersion = "3.8.0";
SqliteDialect.prototype.Query = Query;
SqliteDialect.prototype.DataTypes = DataTypes;
SqliteDialect.prototype.name = "sqlite";
SqliteDialect.prototype.TICK_CHAR = "`";
SqliteDialect.prototype.TICK_CHAR_LEFT = SqliteDialect.prototype.TICK_CHAR;
SqliteDialect.prototype.TICK_CHAR_RIGHT = SqliteDialect.prototype.TICK_CHAR;

module.exports = SqliteDialect;
module.exports.SqliteDialect = SqliteDialect;
module.exports.default = SqliteDialect;

adone.lazify({
    QueryGenerator: "./query_generator"
}, SqliteDialect, require);
