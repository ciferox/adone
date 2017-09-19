const bson = adone.lazify({
    native: () => adone.bind("bson.node").BSON,
    serializer: () => new bson.BSON(),
    Binary: "./binary",
    Code: "./code",
    DBRef: "./db_ref",
    Decimal128: "./decimal128",
    Double: "./double",
    Int32: "./int_32",
    Long: "./long",
    Map: () => Map,
    MaxKey: "./max_key",
    MinKey: "./min_key",
    ObjectId: "./objectid",
    BSONRegExp: "./regexp",
    Symbol: "./symbol",
    Timestamp: "./timestamp",
    BSON: () => class BSON extends bson.native {
        constructor(types = [
            bson.Binary, bson.Code, bson.DBRef,
            bson.Decimal128, bson.Double, bson.Int32,
            bson.Long, bson.Map, bson.MaxKey,
            bson.MinKey, bson.ObjectId, bson.BSONRegExp,
            bson.Symbol, bson.Timestamp
        ]) {
            super(types);
        }
    }
}, exports, require);

export const c = {
    BSON_INT32_MIN: -0x80000000,
    BSON_INT32_MAX: 0x7FFFFFFF,
    BSON_INT64_MAX: 2 ** 63 - 1,
    BSON_INT64_MIN: -(2 ** 63),
    JS_INT_MAX: 0x20000000000000,
    JS_INT_MIN: -0x20000000000000
};

export const encode = (obj, opts) => bson.serializer.serialize(obj, opts);

export const decode = (buf, opts) => bson.serializer.deserialize(buf, Object.assign({
    promoteBuffers: true,
    promoteValues: true
}, opts));
