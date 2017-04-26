const { lazify } = adone;

const mongo = lazify({
    core: "./core",
    Instrumentation: "./lib/apm",
    connect: ["./lib/mongo_client", (x) => x.connect],
    MongoClient: "./lib/mongo_client",
    MongoError: () => mongo.core.MongoError,
    Admin: "./lib/admin",
    Db: "./lib/db",
    Collection: "./lib/collection",
    Server: "./lib/server",
    ReplSet: "./lib/replset",
    Mongos: "./lib/mongos",
    ReadPreference: "./lib/read_preference",
    GridStore: "./lib/gridfs/grid_store",
    Chunk: "./lib/gridfs/chunk",
    Logger: () => mongo.core.Logger,
    Cursor: "./lib/cursor",
    GridFSBucket: "./lib/gridfs-stream",
    CoreServer: () => mongo.core.Server,
    CoreConnection: () => mongo.core.Connection,
    Binary: () => adone.data.bson.Binary,
    Code: () => adone.data.bson.Code,
    Map: () => adone.data.bson.Map,
    DBRef: () => adone.data.bson.DBRef,
    Double: () => adone.data.bson.Double,
    Int32: () => adone.data.bson.Int32,
    Long: () => adone.data.bson.Long,
    MinKey: () => adone.data.bson.MinKey,
    MaxKey: () => adone.data.bson.MaxKey,
    ObjectID: () => adone.data.bson.ObjectID,
    Symbol: () => adone.data.bson.Symbol,
    Timestamp: () => adone.data.bson.Timestamp,
    Decimal128: () => adone.data.bson.Decimal128,
    BSONRegExp: () => adone.data.bson.BSONRegExp,
    instrument: () => function (options, callback) {
        if (typeof options === "function") {
            callback = options, options = {};
        }
        return new mongo.Instrumentation(mongo.core, options, callback);
    }
}, exports, require);
