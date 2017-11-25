import defineDataTypes from "./data_types";

const {
    vendor: { lodash: _ },
    orm
} = adone;

const {
    dialect: {
        abstract: AbstractDialect
    }
} = adone.private(orm);

export default class MysqlDialect extends AbstractDialect {
    constructor(sequelize) {
        super();
        this.sequelize = sequelize;
        this.connectionManager = new MysqlDialect.ConnectionManager(this, sequelize);
        this.QueryGenerator = _.extend({}, MysqlDialect.QueryGenerator, {
            options: sequelize.options,
            _dialect: this,
            sequelize
        });
    }
}

MysqlDialect.prototype.supports = _.merge(_.cloneDeep(AbstractDialect.prototype.supports), {
    "VALUES ()": true,
    "LIMIT ON UPDATE": true,
    IGNORE: " IGNORE",
    lock: true,
    forShare: "LOCK IN SHARE MODE",
    index: {
        collate: false,
        length: true,
        parser: true,
        type: true,
        using: 1
    },
    constraints: {
        dropConstraint: false,
        check: false
    },
    ignoreDuplicates: " IGNORE",
    updateOnDuplicate: true,
    indexViaAlter: true,
    NUMERIC: true,
    GEOMETRY: true,
    JSON: true,
    REGEXP: true
});

MysqlDialect.prototype.DataTypes = defineDataTypes(orm.type);
MysqlDialect.prototype.name = "mysql";
MysqlDialect.prototype.TICK_CHAR = "`";
MysqlDialect.prototype.TICK_CHAR_LEFT = MysqlDialect.prototype.TICK_CHAR;
MysqlDialect.prototype.TICK_CHAR_RIGHT = MysqlDialect.prototype.TICK_CHAR;

adone.lazify({
    QueryGenerator: "./query_generator",
    ConnectionManager: "./connection_manager",
    Query: "./query",
    QueryInterface: "./query_interface"
}, MysqlDialect, require);

adone.lazify({
    Query: () => MysqlDialect.Query
}, MysqlDialect.prototype);
