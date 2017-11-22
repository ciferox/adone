const { vendor: { lodash: _ } } = adone;
const AbstractDialect = require("../abstract");
const ConnectionManager = require("./connection_manager");
const Query = require("./query");
const QueryGenerator = require("./query_generator");
const DataTypes = require("../../data_types").mssql;

class MssqlDialect extends AbstractDialect {
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

MssqlDialect.prototype.supports = _.merge(_.cloneDeep(AbstractDialect.prototype.supports), {
    DEFAULT: true,
    "DEFAULT VALUES": true,
    "LIMIT ON UPDATE": true,
    "ORDER NULLS": false,
    lock: false,
    transactions: true,
    migrations: false,
    upserts: true,
    returnValues: {
        output: true
    },
    schemas: true,
    autoIncrement: {
        identityInsert: true,
        defaultValue: false,
        update: false
    },
    constraints: {
        restrict: false,
        default: true
    },
    index: {
        collate: false,
        length: false,
        parser: false,
        type: true,
        using: false,
        where: true
    },
    NUMERIC: true,
    tmpTableTrigger: true
});

ConnectionManager.prototype.defaultVersion = "12.0.2000"; // SQL Server 2014 Express
MssqlDialect.prototype.Query = Query;
MssqlDialect.prototype.name = "mssql";
MssqlDialect.prototype.TICK_CHAR = '"';
MssqlDialect.prototype.TICK_CHAR_LEFT = "[";
MssqlDialect.prototype.TICK_CHAR_RIGHT = "]";
MssqlDialect.prototype.DataTypes = DataTypes;

module.exports = MssqlDialect;

adone.lazify({
    QueryGenerator: "./query_generator",
    ResourceLock: "./resource_lock",
    Query: "./query"
}, MssqlDialect, require);
