import dataTypes from "./data_types";

const {
    lodash: _,
    orm
} = adone;

const {
    dialect: {
        abstract: AbstractDialect
    }
} = adone.private(orm);

export default class SqliteDialect extends AbstractDialect {
    constructor(sequelize) {
        super();
        this.sequelize = sequelize;
        this.connectionManager = new SqliteDialect.ConnectionManager(this, sequelize);
        this.QueryGenerator = _.extend({}, SqliteDialect.QueryGenerator, {
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

SqliteDialect.prototype.DataTypes = dataTypes(orm.type);
SqliteDialect.prototype.name = "sqlite";
SqliteDialect.prototype.TICK_CHAR = "`";
SqliteDialect.prototype.TICK_CHAR_LEFT = SqliteDialect.prototype.TICK_CHAR;
SqliteDialect.prototype.TICK_CHAR_RIGHT = SqliteDialect.prototype.TICK_CHAR;

adone.lazify({
    ConnectionManager: "./connection_manager",
    QueryGenerator: "./query_generator",
    Query: "./query",
    QueryInterface: "./query_interface"
}, SqliteDialect, require);

adone.lazify({
    Query: () => SqliteDialect.Query
}, SqliteDialect.prototype);
