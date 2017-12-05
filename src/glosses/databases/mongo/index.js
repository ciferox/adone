const {
    is,
    lazify,
    lazifyPrivate
} = adone;

const mongo = lazify({
    core: "./core",
    MongoClient: "./client",
    MongoError: () => __.core.MongoError, // eslint-disable-line no-use-before-define
    Binary: () => adone.data.bson.Binary,
    Code: () => adone.data.bson.Code,
    Map: () => adone.data.bson.Map,
    DBRef: () => adone.data.bson.DBRef,
    Double: () => adone.data.bson.Double,
    Int32: () => adone.data.bson.Int32,
    Long: () => adone.data.bson.Long,
    MinKey: () => adone.data.bson.MinKey,
    MaxKey: () => adone.data.bson.MaxKey,
    ObjectId: () => adone.data.bson.ObjectId,
    Symbol: () => adone.data.bson.Symbol,
    Timestamp: () => adone.data.bson.Timestamp,
    Decimal128: () => adone.data.bson.Decimal128,
    BSONRegExp: () => adone.data.bson.BSONRegExp,
    ReadPreference: "./read_preference",
    GridFSBucket: "./gridfs_stream",
    GridStore: "./grid_store",
    QueryBuilder: "./query_builder"
}, exports, require);

lazifyPrivate({
    Instrumentation: "./__/apm",
    Admin: "./__/admin",
    Db: "./__/db",
    Collection: "./__/collection",
    Server: "./__/server",
    ReplSet: "./__/replset",
    Mongos: "./__/mongos",
    Cursor: "./__/cursor",
    CommandCursor: "./__/command_cursor",
    AggregationCursor: "./__/aggregation_cursor",
    parseUrl: "./__/url_parser",
    metadata: "./__/metadata",
    utils: "./__/utils",
    authenticate: "./__/authenticate",
    bulk: "./__/bulk",
    ServerCapabilities: ["./__/topology_base", (x) => x.ServerCapabilities],
    Store: ["./__/topology_base", (x) => x.Store],
    Chunk: "./__/gridfs/chunk",
    core: "./__/core"
}, exports, require);

const __ = adone.private(mongo);

export const instrument = (options, callback) => {
    if (is.function(options)) {
        [callback, options] = [options, {}];
    }
    return new __.Instrumentation(__.core, options, callback);
};

export const connect = (...args) => new mongo.MongoClient({ relayEvents: false }).connect(...args);

export const buildQuery = (...args) => new mongo.QueryBuilder(...args);
