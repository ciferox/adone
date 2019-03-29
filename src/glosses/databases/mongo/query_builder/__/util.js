const {
    is
} = adone;

class Cloner extends adone.util.clone.Cloner {
    clone(obj) {
        if (obj instanceof adone.data.bson.ObjectId) {
            return new adone.data.bson.ObjectId(obj.id);
        }

        if (obj instanceof adone.database.mongo.ReadPreference) {
            return new adone.database.mongo.ReadPreference(obj.mode, super.clone(obj.tags), super.clone(obj.options));
        }

        if (obj instanceof adone.data.bson.Binary) {
            return new adone.data.bson.Binary(obj.value(true), obj.subType);
        }

        return super.clone(obj);
    }
}

export const clone = new Cloner().binding();

export const merge = (to, from) => {
    const keys = Object.keys(from);
    let i = keys.length;
    let key;

    while (i--) {
        key = keys[i];
        if (is.undefined(to[key])) {
            to[key] = from[key];
        } else {
            if (is.object(from[key])) {
                merge(to[key], from[key]);
            } else {
                to[key] = from[key];
            }
        }
    }
};

export const mergeClone = (to, from) => {
    const keys = Object.keys(from);
    let i = keys.length;
    let key;

    while (i--) {
        key = keys[i];
        if (is.undefined(to[key])) {
            // make sure to retain key order here because of a bug handling the $each
            // operator in mongodb 2.4.4
            to[key] = clone(from[key]);
        } else {
            if (is.object(from[key])) {
                mergeClone(to[key], from[key]);
            } else {
                // make sure to retain key order here because of a bug handling the
                // $each operator in mongodb 2.4.4
                to[key] = clone(from[key]);
            }
        }
    }
};

export const readPref = (pref) => {
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

    return pref;
};
