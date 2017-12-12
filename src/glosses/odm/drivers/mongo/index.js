const {
    is,
    // database: { mongo }
} = adone;

const mongo = require("mongodb");

/*!
 * Converts arguments to ReadPrefs the driver
 * can understand.
 *
 * @param {String|Array} pref
 * @param {Array} [tags]
 */

exports.ReadPreference = (pref, tags) => {
    if (is.array(pref)) {
        tags = pref[1];
        pref = pref[0];
    }

    if (pref instanceof mongo.ReadPreference) {
        return pref;
    }

    switch (pref) {
        case "p":
            pref = "primary";
            break;
        case "pp":
            pref = "primaryPreferred";
            break;
        case "s":
            pref = "secondary";
            break;
        case "sp":
            pref = "secondaryPreferred";
            break;
        case "n":
            pref = "nearest";
            break;
    }

    return new mongo.ReadPreference(pref, tags);
};

exports.Binary = mongo.Binary;
exports.ObjectId = mongo.ObjectId;
