adone.lazify({
    createIndex: "./create_index",
    find: ["./find", (x) => x.find],
    explain: ["./find", (x) => x.explain],
    getIndexes: "./get_indexes",
    deleteIndex: "./delete_index",
    util: "./utils",
    abstractMapper: "./abstract_mapper",
    queryPlanner: "./query_planner"
}, exports, require);
