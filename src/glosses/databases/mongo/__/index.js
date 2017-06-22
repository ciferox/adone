const { lazify } = adone;

lazify({
    Instrumentation: "./apm",
    Admin: "./admin",
    Db: "./db",
    Collection: "./collection",
    Server: "./server",
    ReplSet: "./replset",
    Mongos: "./mongos",
    Cursor: "./cursor",
    CommandCursor: "./command_cursor",
    AggregationCursor: "./aggregation_cursor",
    parseUrl: "./url_parser",
    metadata: "./metadata",
    utils: "./utils",
    authenticate: "./authenticate",
    bulk: "./bulk",
    ServerCapabilities: ["./topology_base", (x) => x.ServerCapabilities],
    Store: ["./topology_base", (x) => x.Store],
    Chunk: "./gridfs/chunk"
}, exports, require);
