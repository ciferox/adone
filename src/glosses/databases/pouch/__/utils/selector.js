const { is, util } = adone;

// this would just be "return doc[field]", but fields
// can be "deep" due to dot notation
const getFieldFromDoc = (doc, parsedField) => {
    let value = doc;
    for (let i = 0, len = parsedField.length; i < len; i++) {
        const key = parsedField[i];
        value = value[key];
        if (!value) {
            break;
        }
    }
    return value;
};

const setFieldInDoc = (doc, parsedField, value) => {
    for (var i = 0, len = parsedField.length; i < len - 1; i++) {
        const elem = parsedField[i];
        doc = doc[elem] = {};
    }
    doc[parsedField[len - 1]] = value;
};

const compare = (left, right) => {
    return left < right ? -1 : left > right ? 1 : 0;
};

// Converts a string in dot notation to an array of its components, with backslash escaping
const parseField = (fieldName) => {
    // fields may be deep (e.g. "foo.bar.baz"), so parse
    const fields = [];
    let current = "";
    for (let i = 0, len = fieldName.length; i < len; i++) {
        const ch = fieldName[i];
        if (ch === ".") {
            if (i > 0 && fieldName[i - 1] === "\\") { // escaped delimiter
                current = `${current.substring(0, current.length - 1)}.`;
            } else { // not escaped, so delimiter
                fields.push(current);
                current = "";
            }
        } else { // normal character
            current += ch;
        }
    }
    fields.push(current);
    return fields;
};

const combinationFields = ["$or", "$nor", "$not"];
const isCombinationalField = (field) => {
    return combinationFields.indexOf(field) > -1;
};

const getKey = (obj) => {
    return Object.keys(obj)[0];
};

const getValue = (obj) => {
    return obj[getKey(obj)];
};


// flatten an array of selectors joined by an $and operator
const mergeAndedSelectors = (selectors) => {

    // sort to ensure that e.g. if the user specified
    // $and: [{$gt: 'a'}, {$gt: 'b'}], then it's collapsed into
    // just {$gt: 'b'}
    const res = {};

    selectors.forEach((selector) => {
        Object.keys(selector).forEach((field) => {
            let matcher = selector[field];
            if (typeof matcher !== "object") {
                matcher = { $eq: matcher };
            }

            if (isCombinationalField(field)) {
                if (matcher instanceof Array) {
                    res[field] = matcher.map((m) => {
                        return mergeAndedSelectors([m]);
                    });
                } else {
                    res[field] = mergeAndedSelectors([matcher]);
                }
            } else {
                const fieldMatchers = res[field] = res[field] || {};
                Object.keys(matcher).forEach((operator) => {
                    const value = matcher[operator];

                    if (operator === "$gt" || operator === "$gte") {
                        return mergeGtGte(operator, value, fieldMatchers);
                    } else if (operator === "$lt" || operator === "$lte") {
                        return mergeLtLte(operator, value, fieldMatchers);
                    } else if (operator === "$ne") {
                        return mergeNe(value, fieldMatchers);
                    } else if (operator === "$eq") {
                        return mergeEq(value, fieldMatchers);
                    }
                    fieldMatchers[operator] = value;
                });
            }
        });
    });

    return res;
};



// collapse logically equivalent gt/gte values
const mergeGtGte = (operator, value, fieldMatchers) => {
    if (!is.undefined(fieldMatchers.$eq)) {
        return; // do nothing
    }
    if (!is.undefined(fieldMatchers.$gte)) {
        if (operator === "$gte") {
            if (value > fieldMatchers.$gte) { // more specificity
                fieldMatchers.$gte = value;
            }
        } else { // operator === '$gt'
            if (value >= fieldMatchers.$gte) { // more specificity
                delete fieldMatchers.$gte;
                fieldMatchers.$gt = value;
            }
        }
    } else if (!is.undefined(fieldMatchers.$gt)) {
        if (operator === "$gte") {
            if (value > fieldMatchers.$gt) { // more specificity
                delete fieldMatchers.$gt;
                fieldMatchers.$gte = value;
            }
        } else { // operator === '$gt'
            if (value > fieldMatchers.$gt) { // more specificity
                fieldMatchers.$gt = value;
            }
        }
    } else {
        fieldMatchers[operator] = value;
    }
};

// collapse logically equivalent lt/lte values
const mergeLtLte = (operator, value, fieldMatchers) => {
    if (!is.undefined(fieldMatchers.$eq)) {
        return; // do nothing
    }
    if (!is.undefined(fieldMatchers.$lte)) {
        if (operator === "$lte") {
            if (value < fieldMatchers.$lte) { // more specificity
                fieldMatchers.$lte = value;
            }
        } else { // operator === '$gt'
            if (value <= fieldMatchers.$lte) { // more specificity
                delete fieldMatchers.$lte;
                fieldMatchers.$lt = value;
            }
        }
    } else if (!is.undefined(fieldMatchers.$lt)) {
        if (operator === "$lte") {
            if (value < fieldMatchers.$lt) { // more specificity
                delete fieldMatchers.$lt;
                fieldMatchers.$lte = value;
            }
        } else { // operator === '$gt'
            if (value < fieldMatchers.$lt) { // more specificity
                fieldMatchers.$lt = value;
            }
        }
    } else {
        fieldMatchers[operator] = value;
    }
};

// combine $ne values into one array
const mergeNe = (value, fieldMatchers) => {
    if ("$ne" in fieldMatchers) {
        // there are many things this could "not" be
        fieldMatchers.$ne.push(value);
    } else { // doesn't exist yet
        fieldMatchers.$ne = [value];
    }
};

// add $eq into the mix
const mergeEq = (value, fieldMatchers) => {
    // these all have less specificity than the $eq
    // TODO: check for user errors here
    delete fieldMatchers.$gt;
    delete fieldMatchers.$gte;
    delete fieldMatchers.$lt;
    delete fieldMatchers.$lte;
    delete fieldMatchers.$ne;
    fieldMatchers.$eq = value;
};


//
// normalize the selector
//
const massageSelector = (input) => {
    let result = util.clone(input);
    let wasAnded = false;
    if ("$and" in result) {
        result = mergeAndedSelectors(result.$and);
        wasAnded = true;
    }

    ["$or", "$nor"].forEach((orOrNor) => {
        if (orOrNor in result) {
            // message each individual selector
            // e.g. {foo: 'bar'} becomes {foo: {$eq: 'bar'}}
            result[orOrNor].forEach((subSelector) => {
                const fields = Object.keys(subSelector);
                for (let i = 0; i < fields.length; i++) {
                    const field = fields[i];
                    const matcher = subSelector[field];
                    if (typeof matcher !== "object" || is.null(matcher)) {
                        subSelector[field] = { $eq: matcher };
                    }
                }
            });
        }
    });

    if ("$not" in result) {
        //This feels a little like forcing, but it will work for now,
        //I would like to come back to this and make the merging of selectors a little more generic
        result.$not = mergeAndedSelectors([result.$not]);
    }

    const fields = Object.keys(result);

    for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        let matcher = result[field];

        if (typeof matcher !== "object" || is.null(matcher)) {
            matcher = { $eq: matcher };
        } else if ("$ne" in matcher && !wasAnded) {
            // I put these in an array, since there may be more than one
            // but in the "mergeAnded" operation, I already take care of that
            matcher.$ne = [matcher.$ne];
        }
        result[field] = matcher;
    }

    return result;
};

export {
    massageSelector,
    isCombinationalField,
    getKey,
    getValue,
    getFieldFromDoc,
    setFieldInDoc,
    compare,
    parseField
};
