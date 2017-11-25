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

export default class PostgresDialect extends AbstractDialect {
    constructor(sequelize) {
        super();
        this.sequelize = sequelize;
        this.connectionManager = new PostgresDialect.ConnectionManager(this, sequelize);
        this.QueryGenerator = _.extend({}, PostgresDialect.QueryGenerator, {
            options: sequelize.options,
            _dialect: this,
            sequelize
        });
    }
}

PostgresDialect.prototype.supports = _.merge(_.cloneDeep(AbstractDialect.prototype.supports), {
    "DEFAULT VALUES": true,
    EXCEPTION: true,
    "ON DUPLICATE KEY": false,
    "ORDER NULLS": true,
    returnValues: {
        returning: true
    },
    bulkDefault: true,
    schemas: true,
    lock: true,
    lockOf: true,
    lockKey: true,
    lockOuterJoinFailure: true,
    forShare: "FOR SHARE",
    index: {
        concurrently: true,
        using: 2,
        where: true
    },
    NUMERIC: true,
    ARRAY: true,
    RANGE: true,
    GEOMETRY: true,
    REGEXP: true,
    GEOGRAPHY: true,
    JSON: true,
    JSONB: true,
    HSTORE: true,
    deferrableConstraints: true,
    searchPath: true
});

PostgresDialect.prototype.DataTypes = dataTypes(orm.type);
PostgresDialect.prototype.name = "postgres";
PostgresDialect.prototype.TICK_CHAR = '"';
PostgresDialect.prototype.TICK_CHAR_LEFT = PostgresDialect.prototype.TICK_CHAR;
PostgresDialect.prototype.TICK_CHAR_RIGHT = PostgresDialect.prototype.TICK_CHAR;

adone.lazify({
    QueryGenerator: "./query_generator",
    hstore: "./hstore",
    range: "./range",
    Query: "./query"
}, PostgresDialect, require);

adone.lazify({
    Query: () => PostgresDialect.Query
}, PostgresDialect.prototype);
