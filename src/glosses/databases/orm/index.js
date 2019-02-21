const orm = adone.lazify({
    error: "./errors",
    type: "./data_types",
    operator: "./operators",
    util: "./utils",
    Sequelize: "./sequelize",
    Transaction: "./transaction",
    Deferrable: "./deferrable",
    queryType: "./query_types",
    hooks: () => __.Hooks.interfaceFor(orm.Sequelize)
}, exports, require);

adone.lazifyPrivate({
    dialect: "./dialects",
    InstanceValidator: "./instance_validator",
    association: "./associations",
    Model: "./model",
    Hooks: "./hooks",
    ModelManager: "./model_manager",
    QueryInterface: "./query_interface",
    TableHints: "./table_hints"
}, exports, require);

const __ = adone.private(orm);

export const create = (...args) => new orm.Sequelize(...args);
