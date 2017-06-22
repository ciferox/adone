const { is, lazify } = adone;

const mongo = lazify({
    __: "./__",
    core: "./core",
    MongoClient: "./client",
    MongoError: () => mongo.core.MongoError,
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
    GridStore: "./grid_store"
}, exports, require);

export const instrument = (options, callback) => {
    if (is.function(options)) {
        [callback, options] = [options, {}];
    }
    return new mongo.__.Instrumentation(mongo.core, options, callback);
};

export const connect = (...args) => new mongo.MongoClient({ relayEvents: false }).connect(...args);
