import dataTypes from "./data_types";

const {
    vendor: { lodash: _ },
    orm
} = adone;

const {
    dialect: {
        abstract: AbstractDialect
    }
} = adone.private(orm);

export default class MssqlDialect extends AbstractDialect {
    constructor(sequelize) {
        super();
        this.sequelize = sequelize;
        this.connectionManager = new MssqlDialect.ConnectionManager(this, sequelize);
        this.QueryGenerator = _.extend({}, MssqlDialect.QueryGenerator, {
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

MssqlDialect.prototype.name = "mssql";
MssqlDialect.prototype.TICK_CHAR = '"';
MssqlDialect.prototype.TICK_CHAR_LEFT = "[";
MssqlDialect.prototype.TICK_CHAR_RIGHT = "]";
MssqlDialect.prototype.DataTypes = dataTypes(orm.type);

adone.lazify({
    QueryGenerator: "./query_generator",
    ResourceLock: "./resource_lock",
    Query: "./query",
    QueryInterface: "./query_interface"
}, MssqlDialect, require);

adone.lazify({
    Query: () => MssqlDialect.Query
}, MssqlDialect.prototype);
