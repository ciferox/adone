const { json, bson, mpak, json5, protobuf } = adone.data;

const protoBuf = protobuf.create(require("./proto.data"));

const object = {
    foo: "hello",
    hello: 42,
    payload: Buffer.from("a"),
    meh: {
        b: {
            tmp: {
                baz: 1000
            }
        },
        lol: "lol"
    }
};


let jsonData = null;
let bsonData = null;
let mpakData = null;
let json5Data = null;
let protoData = null;

export const init = async () => {
    jsonData = json.encode(object);
    bsonData = bson.encode(object);
    mpakData = mpak.encode(object);
    json5Data = json5.encode(object);
    protoData = protoBuf.Test.encode(object);

    let initor;
    initor = bson.serializer;
    initor = mpak.serializer;
    return initor;
};

export default {
    Encode: {
        "json"() {
            return json.encode(object);
        },
        "bson"() {
            return bson.encode(object);
        },
        "mpak"() {
            return mpak.encode(object);
        },
        "json5"() {
            return json5.encode(object);
        },
        "protobuf"() {
            return protoBuf.Test.encode(object);
        }
    },
    Decode: {
        "json"() {
            return json.decode(jsonData);
        },
        "bson"() {
            return bson.decode(bsonData);
        },
        "mpak"() {
            return mpak.decode(mpakData);
        },
        "json5"() {
            return json5.decode(json5Data);
        },
        "protobuf"() {
            return protoBuf.Test.decode(protoData);
        }
    }
};
