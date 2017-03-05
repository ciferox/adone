import adone from "adone";
import Binary from "./lib/binary";
import Code from "./lib/code";
import DBRef from "./lib/db_ref";
import Decimal128 from "./lib/decimal128";
import Double from "./lib/double";
import Int32 from "./lib/int_32";
import Long from "./lib/long";
import Map from "./lib/map";
import MaxKey from "./lib/max_key";
import MinKey from "./lib/min_key";
import ObjectId from "./lib/objectid";
import BSONRegExp from "./lib/regexp";
import Symbol from "./lib/symbol";
import Timestamp from "./lib/timestamp";

const $BSON = adone.bind("bson.node").BSON;

class BSON extends $BSON {
    constructor(types = [
        BSON.Binary,
        BSON.Code,
        BSON.DBRef,
        BSON.Decimal128,
        BSON.Double,
        BSON.Int32,
        BSON.Long,
        BSON.Map,
        BSON.MaxKey,
        BSON.MinKey,
        BSON.ObjectId,
        BSON.BSONRegExp,
        BSON.Symbol,
        BSON.Timestamp
    ]) {
        super(types);
    }
}


// BSON MAX VALUES
BSON.BSON_INT32_MAX = 0x7FFFFFFF;
BSON.BSON_INT32_MIN = -0x80000000;

BSON.BSON_INT64_MAX = Math.pow(2, 63) - 1;
BSON.BSON_INT64_MIN = -Math.pow(2, 63);

// JS MAX PRECISE VALUES
BSON.JS_INT_MAX = 0x20000000000000;  // Any integer up to 2^53 can be precisely represented by a double.
BSON.JS_INT_MIN = -0x20000000000000;  // Any integer down to -2^53 can be precisely represented by a double.

// Add BSON types to function creation
BSON.Binary = Binary;
BSON.Code = Code;
BSON.DBRef = DBRef;
BSON.Decimal128 = Decimal128;
BSON.Double = Double;
BSON.Int32 = Int32;
BSON.Long = Long;
BSON.Map = Map;
BSON.MaxKey = MaxKey;
BSON.MinKey = MinKey;
BSON.ObjectId = ObjectId;
BSON.ObjectID = ObjectId;
BSON.BSONRegExp = BSONRegExp;
BSON.Symbol = Symbol;
BSON.Timestamp = Timestamp;

export default BSON;
