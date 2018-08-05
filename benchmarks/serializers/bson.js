const {
    data: { bson: BSON, bson2 }
} = adone;

const bson = new BSON.BSON([BSON.Binary, BSON.Code, BSON.DBRef, BSON.Decimal128,
    BSON.Double, BSON.Int32, BSON.Long, BSON.Map, BSON.MaxKey, BSON.MinKey,
    BSON.ObjectId, BSON.BSONRegExp, BSON.Symbol, BSON.Timestamp]);
// const bson2 = new BSON2.BSON([BSON2.Binary, BSON2.Code, BSON2.DBRef, BSON2.Decimal128,
//     BSON2.Double, BSON2.Int32, BSON2.Long, BSON2.Map, BSON2.MaxKey, BSON2.MinKey,
//     BSON2.ObjectId, BSON2.BSONRegExp, BSON2.Symbol, BSON2.Timestamp]);
const BSONJS = require("bson");
const bsonJS = new BSONJS();

const generateRecord = function (recnum) {
    // Definition of a 'Document'
    const topFields = 20; // 20 top level fields
    const arrObjSize = 10; // 10 fields in each array object
    const arrSize = 20; // Array of 20 elements
    const fldpfx = "val";

    //This is a shard friendly _id, a low cardinality, variable prefix then an incrementing value as string
    const id = `${(recnum % 256).toString()}-${recnum}`;
    const rec = {
        _id: id,
        arr: []
    };

    let tf;
    for (tf = 0; tf < topFields; tf++) {
        let fieldval;
        switch (tf % 4) {
            case 0:
                fieldval = "Lorem ipsum dolor sit amet, consectetur adipiscing elit."; //Text
                break;
            case 1:
                fieldval = new Date(tf * recnum); //A date
                break;
            case 2:
                fieldval = Math.PI * tf; // A float
                break;
            case 3:
                fieldval = new BSON.Long(recnum + tf); // A 64 bit integer
                break;
        }
        // fieldval = Math.PI * tf // A float
        // fieldval = new Date(tf * recnum) //A date
        // fieldval = "Lorem ipsum dolor sit amet, consectetur adipiscing elit." //Text
        // fieldval = BSON.Long(recnum + tf) // A 64 bit integer
        // fieldval = [BSON.Long(recnum + tf), BSON.Long(recnum + tf), BSON.Long(recnum + tf)]
        rec[fldpfx + tf] = fieldval;
    }

    // populate array of subdocuments
    for (let el = 0; el < arrSize; el++) {
        const subrec = {};
        for (let subRecField = 0; subRecField < arrObjSize; subRecField++) {
            let fieldval;
            switch (subRecField % 4) {
                case 0:
                    fieldval = "Nunc finibus pretium dignissim. Aenean ut nisi finibus";
                    break;
                case 1:
                    fieldval = new Date(tf * recnum * el);
                    break;
                case 2:
                    fieldval = Math.PI * tf * el;
                    break;
                case 3:
                    fieldval = new BSON.Long(recnum + tf * el);
                    break;
            }
            // fieldval = Math.PI * tf * el
            // fieldval = new Date(tf * recnum * el)
            // fieldval = "Nunc finibus pretium dignissim. Aenean ut nisi finibus"
            // fieldval = BSON.Long(recnum + tf * el)
            // fieldval = [BSON.Long(recnum + tf * el), BSON.Long(recnum + tf * el), BSON.Long(recnum + tf * el)]
            subrec[`subval${subRecField}`] = fieldval;
        }
        rec.arr.push(subrec);
    }

    return rec;
};

const doc = generateRecord(0);
const buffer = bson.serialize(doc);

export default {
    Encode: {
        "adone1"() {
            return bson.serialize(doc);
        },
        "adone2"() {
            return bson2.encode(doc);
        },
        "pure js version"() {
            return bsonJS.serialize(doc);
        }
    },
    Decode: {
        "adone1"() {
            return bson.deserialize(buffer);
        },
        "adone2"() {
            return bson2.decode(buffer);
        },
        "pure js version"() {
            return bsonJS.deserialize(buffer);
        }
    }
};
