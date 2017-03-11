
const { is, x, util } = adone;

// Document modificators

const lastStepModifierFunctions = {
    $set: (obj, field, value) => {
        obj[field] = value;
    },
    $unset: (obj, field) => {
        delete obj[field];
    },
    // Push an element to the end of an array field
    // Optional modifier $each instead of value to push several values
    // Optional modifier $slice to slice the resulting array, see https://docs.mongodb.org/manual/reference/operator/update/slice/
    // Différeence with MongoDB: if $slice is specified and not $each, we act as if value is an empty array
    $push: (obj, field, value) => {
        // Create the array if it doesn't exist
        if (!obj.hasOwnProperty(field)) {
            obj[field] = [];
        }

        if (!is.array(obj[field])) {
            throw new x.IllegalState("Can't $push an element on non-array values");
        }

        const valueIsObject = is.object(value);

        if (value !== null && valueIsObject && value.$slice && is.undefined(value.$each)) {
            value.$each = [];
        }

        if (!is.null(value) && valueIsObject && value.$each) {
            const valueKeys = util.keys(value);
            if (valueKeys.length >= 3 || (valueKeys.length === 2 && value.$slice === undefined)) {
                throw new x.IllegalState("Can only use $slice in cunjunction with $each when $push to array");
            }
            if (!is.array(value.$each)) {
                throw new x.IllegalState("$each requires an array value");
            }

            for (let i = 0; i < value.$each.length; ++i) {
                obj[field].push(value.$each[i]);
            }

            if (is.undefined(value.$slice) || !is.number(value.$slice)) {
                return;
            }

            if (value.$slice === 0) {
                obj[field] = [];
            } else {
                const n = obj[field].length;
                let start;
                let end;
                if (value.$slice < 0) {
                    start = Math.max(0, n + value.$slice);
                    end = n;
                } else if (value.$slice > 0) {
                    start = 0;
                    end = Math.min(n, value.$slice);
                }
                obj[field] = obj[field].slice(start, end);
            }
        } else {
            obj[field].push(value);
        }
    },
    // Add an element to an array field only if it is not already in it
    // No modification if the element is already in the array
    // Note that it doesn't check whether the original array contains duplicates
    $addToSet: (obj, field, value) => {
        if (!obj.hasOwnProperty(field)) {
            obj[field] = [];
        }

        if (!is.array(obj[field])) {
            throw new x.IllegalState("Can't $addToSet an element on non-array values");
        }

        let addToSet = true;

        if (!is.null(value) && is.object(value) && value.$each) {
            if (util.keys(value).length > 1) {
                throw new x.IllegalState("Can't use another field in conjunction with $each");
            }
            if (!is.array(value.$each)) {
                throw new x.IllegalState("$each requires an array value");
            }

            for (let i = 0; i < value.$each.length; ++i) {
                lastStepModifierFunctions.$addToSet(obj, field, value.$each[i]);
            }
        } else {
            const existing = obj[field];
            for (let i = 0; i < existing.length; ++i) {
                // eslint-disable-next-line no-use-before-define
                if (Model.compareThings(existing[i], value) === 0) {
                    addToSet = false;
                    break;
                }
            }
            if (addToSet) {
                obj[field].push(value);
            }
        }
    },
    // Remove the first or last element of an array
    $pop: (obj, field, value) => {
        if (!is.array(obj[field])) {
            throw new x.IllegalState("Can't $pop an element from non-array values");
        }
        if (!is.number(value)) {
            throw new x.IllegalState(`${value} isn't an integer, can't use it with $pop`);
        }
        if (value === 0) {
            return;
        }

        if (value > 0) {
            obj[field] = obj[field].slice(0, obj[field].length - 1);
        } else {
            obj[field] = obj[field].slice(1);
        }
    },
    // Removes all instances of a value from an existing array
    $pull: (obj, field, value) => {
        if (!is.array(obj[field])) {
            throw new x.IllegalState("Can't $pull an element from non-array values");
        }

        const arr = obj[field];
        for (let i = arr.length - 1; i >= 0; i -= 1) {
            // eslint-disable-next-line no-use-before-define
            if (Model.match(arr[i], value)) {
                arr.splice(i, 1);
            }
        }
    },
    // Increment a numeric field's value
    $inc: (obj, field, value) => {
        if (!is.number(value)) {
            throw new x.IllegalState(`${value} must be a number`);
        }

        if (!is.number(obj[field])) {
            if (!is.propertyOwned(obj, field)) {
                obj[field] = value;
            } else {
                throw new x.IllegalState("Don't use the $inc modifier on non-number fields");
            }
        } else {
            obj[field] += value;
        }
    },
    $max: (obj, field, value) => {
        if (is.undefined(obj[field])) {
            obj[field] = value;
        } else if (value > obj[field]) {
            obj[field] = value;
        }
    },
    $min: (obj, field, value) => {
        if (is.undefined(obj[field])) {
            obj[field] = value;
        } else if (value < obj[field]) {
            obj[field] = value;
        }
    }
};

const modifierFunctions = {};

for (const modifier of util.keys(lastStepModifierFunctions)) {
    modifierFunctions[modifier] = (obj, field, value) => {
        if (!obj) {
            return;
        }
        const fieldParts = is.string(field) ? field.split(".") : field;

        if (fieldParts.length === 1) {
            lastStepModifierFunctions[modifier](obj, field, value);
        } else {
            if (is.undefined(obj[fieldParts[0]])) {
                if (modifier === "$unset") {
                    return;
                }   // Bad looking specific fix, needs to be generalized modifiers that behave like $unset are implemented
                obj[fieldParts[0]] = {};
            }
            modifierFunctions[modifier](obj[fieldParts[0]], fieldParts.slice(1), value);
        }
    };
}

// Document finding

const areComparable = (a, b) => {
    if (!is.string(a) && !is.number(a) && !is.date(a) && !is.string(b) && !is.number(b) && !is.date(b)) {
        return false;
    }

    return is.sameType(a, b);
};


const comparisonFunctions = {
    $lt: (a, b) => areComparable(a, b) && a < b,
    $lte: (a, b) => areComparable(a, b) && a <= b,
    $gt: (a, b) => areComparable(a, b) && a > b,
    $gte: (a, b) => areComparable(a, b) && a >= b,
    $ne: (a, b) => is.undefined(a) ? true : !Model.areThingsEqual(a, b), // eslint-disable-line no-use-before-define
    $in: (a, b) => {
        if (!is.array(b)) {
            throw new x.IllegalState("$in operator called with a non-array");
        }

        for (let i = 0; i < b.length; ++i) {
            if (Model.areThingsEqual(a, b[i])) {  // eslint-disable-line no-use-before-define
                return true;
            }
        }

        return false;
    },
    $nin: (a, b) => {
        if (!is.array(b)) {
            throw new x.IllegalState("$nin operator called with a non-array");
        }

        return !comparisonFunctions.$in(a, b);
    },
    $regex: (a, b) => {
        if (!is.regexp(b)) {
            throw new x.IllegalState("$regex operator called with non regular expression");
        }

        if (!is.string(a)) {
            return false;
        }
        return b.test(a);
    },
    $exists: (value, exists) => {
        if (exists || exists === "") {   // This will be true for all values of exists except false, null, undefined and 0
            exists = true;               // That's strange behaviour (we should only use true/false) but that's the way Mongo does it...
        } else {
            exists = false;
        }

        if (is.undefined(value)) {
            return !exists;
        }
        return exists;
    },

    // Array specific

    $size: (obj, value) => {
        if (!is.array(obj)) {
            return false;
        }
        if (!is.integer(value)) {
            throw new x.IllegalState("$size operator called without an integer");
        }

        return obj.length === value;
    },
    $elemMatch: (obj, value) => {
        if (!is.array(obj) || obj.length === 0) {
            return false;
        }
        for (let i = obj.length; i >= 0; --i) {
            if (Model.match(obj[i], value)) {  // eslint-disable-line no-use-before-define
                return true;
            }
        }
        return false;
    }
};

const logicalOperators = {
    $or: (obj, query) => {
        if (!is.array(query)) {
            throw new x.IllegalState("$or operator used without an array");
        }

        for (let i = 0; i < query.length; ++i) {
            if (Model.match(obj, query[i])) {  // eslint-disable-line no-use-before-define
                return true;
            }
        }

        return false;
    },
    $and: (obj, query) => {
        if (!is.array(query)) {
            throw new x.IllegalState("$and operator used without an array");
        }

        for (let i = 0; i < query.length; ++i) {
            if (!Model.match(obj, query[i])) {  // eslint-disable-line no-use-before-define
                return false;
            }
        }

        return true;
    },
    $not: (obj, query) => !Model.match(obj, query),  // eslint-disable-line no-use-before-define
    $where: (obj, fn) => {
        if (!is.function(fn)) {
            throw new x.IllegalState("$where operator used without a function");
        }

        const result = fn.call(obj);
        if (!is.boolean(result)) {
            throw new x.IllegalState("$where function must return boolean");
        }

        return result;
    }
};



// Match an object against a specific { key: value } part of a query
// if the treatObjAsValue flag is set, don't try to match every part separately, but the array as a whole
const matchQueryPart = (obj, queryKey, queryValue, treatObjAsValue) => {
    const objValue = Model.getDotValue(obj, queryKey);  // eslint-disable-line no-use-before-define

    // Check if the value is an array if we don't force a treatment as value
    if (is.array(objValue) && !treatObjAsValue) {
        // If the queryValue is an array, try to perform an exact match
        if (is.array(queryValue)) {
            return matchQueryPart(obj, queryKey, queryValue, true);
        }

        // Check if we are using an array-specific comparison function
        if (!is.null(queryValue) && is.object(queryValue) && !is.regexp(queryValue)) {
            const keys = util.keys(queryValue);
            for (let i = 0; i < keys.length; ++i) {
                if (keys[i] === "$size" || keys[i] === "$elemMatch") {
                    return matchQueryPart(obj, queryKey, queryValue, true);
                }
            }
        }

        // If not, treat it as an array of { obj, query } where there needs to be at least one match
        for (let i = 0; i < objValue.length; ++i) {
            if (matchQueryPart({ k: objValue[i] }, "k", queryValue)) {  // k here could be any string
                return true;
            }
        }
        return false;
    }

    // queryValue is an actual object. Determine whether it contains comparison operators or only normal fields.
    // Mixed objects are not allowed
    if (!is.null(queryValue) && is.object(queryValue) && !is.regexp(queryValue) && !is.array(queryValue)) {
        const keys = util.keys(queryValue);
        const firstChars = keys.map((x) => x[0]);
        const dollarFirstChars = firstChars.filter((c) => c === "$");

        if (dollarFirstChars.length !== 0 && dollarFirstChars.length !== firstChars.length) {
            throw new x.IllegalState("You cannot mix operators and normal fields");
        }

        // queryValue is an object of this form: { $comparisonOperator1: value1, ... }
        if (dollarFirstChars.length > 0) {
            for (let i = 0; i < keys.length; ++i) {
                if (!comparisonFunctions[keys[i]]) {
                    throw new x.IllegalState(`Unknown comparison function ${keys[i]}`);
                }

                if (!comparisonFunctions[keys[i]](objValue, queryValue[keys[i]])) {
                    return false;
                }
            }
            return true;
        }
    }

    if (is.regexp(queryValue)) {
        return comparisonFunctions.$regex(objValue, queryValue);
    }

    if (!Model.areThingsEqual(objValue, queryValue)) {  // eslint-disable-line no-use-before-define
        return false;
    }

    return true;
};

const checkKey = (k, v) => {
    if (is.number(k)) {
        k = k.toString();
    }

    if (k[0] === "$" && !(k === "$$date" && is.number(v)) && !(k === "$$deleted" && v === true) && k !== "$$indexCreated" && k !== "$$indexRemoved") {
        throw new x.IllegalState("Field names cannot begin with the $ character");
    }

    if (k.indexOf(".") !== -1) {
        throw new x.IllegalState("Field names cannot contain a .");
    }
};


// works for numbers string and booleans
const compareNSB = (a, b) => {
    if (a < b) {
        return -1;
    }
    if (a > b) {
        return 1;
    }
    return 0;
};

const compareArrays = (a, b) => {
    for (let i = 0, n = Math.min(a.length, b.length); i < n; ++i) {
        const comp = Model.compareThings(a[i], b[i]);  // eslint-disable-line no-use-before-define
        if (comp !== 0) {
            return comp;
        }
    }

    return compareNSB(a.length, b.length);
};

export default class Model {
     // Serialize an object to be persisted to a one-line string
     // For serialization/deserialization, we use the native JSON parser and not eval or Function
     // That gives us less freedom but data entered in the database may come from users so eval and the like are not safe
     // Accepted primitive types: Number, String, Boolean, Date, null
     // Accepted secondary types: Objects, Arrays
    static serialize(obj) {
        return JSON.stringify(obj, function replacer(k, v) {
            checkKey(k, v);

            if (is.nil(v)) {
                return v;
            }
            // We can't use value directly because for dates it is already string in this function (date.toJSON was already called), so we use this
            if (is.date(this[k])) {
                return { $$date: this[k].getTime() };
            }

            return v;
        });
    }

    static deserialize(rawData) {
        return JSON.parse(rawData, (k, v) => {
            if (k === "$$date") {
                return new Date(v);
            }

            if (is.string(v) || is.number(v) || is.boolean(v) || is.null(v)) {
                return v;
            }

            if (v && v.$$date) {
                return v.$$date;
            }

            return v;
        });
    }

    static deepCopy(obj, strictKeys) {
        if (is.boolean(obj) || is.number(obj) || is.string(obj) || is.null(obj) || is.date(obj)) {
            return obj;
        }

        if (is.array(obj)) {
            return obj.map((x) => Model.deepCopy(x, strictKeys));
        }

        if (is.object(obj)) {
            const res = {};
            const keys = util.keys(obj);
            for (let i = 0; i < keys.length; ++i) {
                const key = keys[i];
                if (!strictKeys || key[0] !== "$" && key.indexOf(".") === -1) {
                    res[key] = Model.deepCopy(obj[key], strictKeys);
                }
            }
            return res;
        }

        // Everything else is undefined. throw an error?
        return undefined;
    }

    static checkObject(obj) {
        if (is.array(obj)) {
            for (let i = 0; i < obj.length; ++i) {
                Model.checkObject(obj[i]);
            }
        }

        if (is.object(obj)) {
            const keys = util.keys(obj);
            for (let i = 0; i < keys.length; ++i) {
                const key = keys[i];
                checkKey(key, obj[key]);
                Model.checkObject(obj[key]);
            }
        }
    }

    // Tells if an object is a primitive type or a "real" object
    // Arrays and dates are considered primitive
    static isPrimitiveType(obj) {
        return is.primitive(obj) || is.date(obj) || is.array(obj);
    }

    static modify(obj, updateQuery) {
        const keys = util.keys(updateQuery);
        const firstChars = keys.map((x) => x[0]);
        const dollarFirstChars = firstChars.filter((c) => c === "$");

        if (keys.indexOf("_id") !== -1 && updateQuery._id !== obj._id) {
            throw new x.IllegalState("You cannot change a document's _id");
        }

        if (dollarFirstChars.length !== 0 && dollarFirstChars.length !== firstChars.length) {
            throw new x.IllegalState("You cannot mix modifiers and normal fields");
        }

        let newDoc;
        if (dollarFirstChars.length === 0) {
            // Simply replace the object with the update query contents
            newDoc = Model.deepCopy(updateQuery);
            newDoc._id = obj._id;
        } else {
            // Apply modifiers
            newDoc = Model.deepCopy(obj);

            for (let i = 0; i < keys.length; ++i) {
                const modifier = keys[i];
                if (!modifierFunctions[modifier]) {
                    throw new x.IllegalState(`Unknown modifier ${modifier}`);
                }

                if (!is.object(updateQuery[modifier])) {
                    throw new x.IllegalState(`Modifier ${modifier}'s argument must be an object`);
                }

                const updateKeys = util.keys(updateQuery[modifier]);

                for (let j = 0; j < updateKeys.length; ++j) {
                    const key = updateKeys[j];
                    modifierFunctions[modifier](newDoc, key, updateQuery[modifier][key]);
                }
            }
        }

        // Check result is valid and return it
        Model.checkObject(newDoc);

        if (obj._id !== newDoc._id) {
            throw new x.IllegalState("You can't change a document's _id");
        }
        return newDoc;
    }

    static getDotValue(obj, field) {
        if (!obj) {
            return undefined;
        }

        const fieldParts = is.string(field) ? field.split(".") : field;

        if (fieldParts.length === 0) {
            return obj;
        }

        if (fieldParts.length === 1) {
            return obj[fieldParts[0]];
        }

        if (is.array(obj[fieldParts[0]])) {
            // If the next field is an integer, return only this item of the array
            const i = parseInt(fieldParts[1], 10);
            if (is.number(i) && !isNaN(i)) {
                return Model.getDotValue(obj[fieldParts[0]][i], fieldParts.slice(2));
            }

            // Return the array of values
            const parts = fieldParts.slice(1);
            return obj[fieldParts[0]].map((x) => Model.getDotValue(x, parts));
        }
        return Model.getDotValue(obj[fieldParts[0]], fieldParts.slice(1));
    }

    static match(obj, query) {
        if (Model.isPrimitiveType(obj) || Model.isPrimitiveType(query)) {
            return matchQueryPart({ needAKey: obj }, "needAKey", query);
        }

        const queryKeys = util.keys(query);
        for (let i = 0; i < queryKeys.length; ++i) {
            const queryKey = queryKeys[i];
            const queryValue = query[queryKey];

            if (queryKey[0] === "$") {
                if (!logicalOperators[queryKey]) {
                    throw new x.Unknown(`Unknown logical operator ${queryKey}`);
                }
                if (!logicalOperators[queryKey](obj, queryValue)) {
                    return false;
                }
            } else {
                if (!matchQueryPart(obj, queryKey, queryValue)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Check whether 'things' are equal
     * Things are defined as any native types (string, number, boolean, null, date) and objects
     * In the case of object, we check deep equality
     * Returns true if they are, false otherwise
     */
    static areThingsEqual(a, b) {
        // Strings, booleans, numbers, null
        if (is.null(a) || is.string(a) || is.boolean(a) || is.number(a) ||
            is.null(b) || is.string(b) || is.boolean(b) || is.number(b)) {
            return a === b;
        }

        // Dates
        if (is.date(a) || is.date(b)) {
            return is.date(a) && is.date(b) && a.getTime() === b.getTime();
        }

        // Arrays (no match since arrays are used as a $in)
        // undefined (no match since they mean field doesn't exist and can't be serialized)
        if ((!(is.array(a) && is.array(b)) && (is.array(a) || is.array(b))) || is.undefined(a) || is.undefined(b)) {
            return false;
        }

        if (!is.object(a) || !is.object(b)) {
            return false;
        }

        const aKeys = util.keys(a);
        const bKeys = util.keys(b);

        if (aKeys.length !== bKeys.length) {
            return false;
        }
        for (let i = 0; i < aKeys.length; ++i) {
            if (bKeys.indexOf(aKeys[i]) === -1) {
                return false;
            }
            if (!Model.areThingsEqual(a[aKeys[i]], b[aKeys[i]])) {
                return false;
            }
        }
        return true;
    }

    // Compare
    // Things are defined as any native types (string, number, boolean, null, date) and objects
    // We need to compare with undefined as it will be used in indexes
    // In the case of objects and arrays, we deep-compare
    // If two objects dont have the same type, the (arbitrary) type hierarchy is: undefined, null, number, strings, boolean, dates, arrays, objects
    // Return -1 if a < b, 1 if a > b and 0 if a = b (note that equality here is NOT the same as defined in areThingsEqual!)
    static compareThings(a, b, compareStrings = compareNSB) {
        if (is.undefined(a)) {
            return is.undefined(b) ? 0 : -1;
        }
        if (is.undefined(b)) {
            return 1;
        }

        if (is.null(a)) {
            return is.null(b) ? 0 : -1;
        }
        if (is.null(b)) {
            return 1;
        }

        if (is.number(a)) {
            return is.number(b) ? compareNSB(a, b) : -1;
        }
        if (is.number(b)) {
            return 1;
        }

        if (is.string(a)) {
            return is.string(b) ? compareStrings(a, b) : -1;
        }
        if (is.string(b)) {
            return 1;
        }

        // Booleans
        if (is.boolean(a)) {
            return is.boolean(b) ? compareNSB(a, b) : -1;
        }
        if (is.boolean(b)) {
            return 1;
        }

        // Dates
        if (is.date(a)) {
            return is.date(b) ? compareNSB(a.getTime(), b.getTime()) : -1;
        }
        if (is.date(b)) {
            return 1;
        }

        // Arrays (first element is most significant and so on)
        if (is.array(a)) {
            return is.array(b) ? compareArrays(a, b) : -1;
        }
        if (is.array(b)) {
            return 1;
        }

        // Objects
        const aKeys = util.keys(a).sort();
        const bKeys = util.keys(b).sort();

        for (let i = 0, n = Math.min(aKeys.length, bKeys.length); i < n; ++i) {
            const comp = Model.compareThings(a[aKeys[i]], b[bKeys[i]]);

            if (comp !== 0) {
                return comp;
            }
        }

        return compareNSB(aKeys.length, bKeys.length);
    }
}
