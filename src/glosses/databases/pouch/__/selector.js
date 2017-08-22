const { is, database: { pouch: { __ } } } = adone;
const {
    collate: { collate },
    util: {
        selector: {
            massageSelector,
            isCombinationalField,
            getKey,
            getValue,
            compare,
            parseField,
            getFieldFromDoc
        }
    }
} = __;

// create a comparator based on the sort object
const createFieldSorter = (sort) => {

    const getFieldValuesAsArray = (doc) => {
        return sort.map((sorting) => {
            const fieldName = getKey(sorting);
            const parsedField = parseField(fieldName);
            const docFieldValue = getFieldFromDoc(doc, parsedField);
            return docFieldValue;
        });
    };

    return function (aRow, bRow) {
        const aFieldValues = getFieldValuesAsArray(aRow.doc);
        const bFieldValues = getFieldValuesAsArray(bRow.doc);
        const collation = collate(aFieldValues, bFieldValues);
        if (collation !== 0) {
            return collation;
        }
        // this is what mango seems to do
        return compare(aRow.doc._id, bRow.doc._id);
    };
};

const filterInMemoryFields = (rows, requestDef, inMemoryFields) => {
    rows = rows.filter((row) => {
        return rowFilter(row.doc, requestDef.selector, inMemoryFields);
    });

    if (requestDef.sort) {
        // in-memory sort
        const fieldSorter = createFieldSorter(requestDef.sort);
        rows = rows.sort(fieldSorter);
        if (!is.string(requestDef.sort[0]) &&
            getValue(requestDef.sort[0]) === "desc") {
            rows = rows.reverse();
        }
    }

    if ("limit" in requestDef || "skip" in requestDef) {
        // have to do the limit in-memory
        const skip = requestDef.skip || 0;
        const limit = ("limit" in requestDef ? requestDef.limit : rows.length) + skip;
        rows = rows.slice(skip, limit);
    }
    return rows;
};

const rowFilter = (doc, selector, inMemoryFields) => {
    return inMemoryFields.every((field) => {
        const matcher = selector[field];
        const parsedField = parseField(field);
        const docFieldValue = getFieldFromDoc(doc, parsedField);
        if (isCombinationalField(field)) {
            return matchCominationalSelector(field, matcher, doc);
        }

        return matchSelector(matcher, doc, parsedField, docFieldValue);
    });
};

const matchSelector = (matcher, doc, parsedField, docFieldValue) => {
    if (!matcher) {
        // no filtering necessary; this field is just needed for sorting
        return true;
    }

    return Object.keys(matcher).every((userOperator) => {
        const userValue = matcher[userOperator];
        return match(userOperator, doc, userValue, parsedField, docFieldValue);
    });
};

const matchCominationalSelector = (field, matcher, doc) => {

    if (field === "$or") {
        return matcher.some((orMatchers) => {
            return rowFilter(doc, orMatchers, Object.keys(orMatchers));
        });
    }

    if (field === "$not") {
        return !rowFilter(doc, matcher, Object.keys(matcher));
    }

    //`$nor`
    return !matcher.find((orMatchers) => {
        return rowFilter(doc, orMatchers, Object.keys(orMatchers));
    });

};

const match = (userOperator, doc, userValue, parsedField, docFieldValue) => {
    if (!matchers[userOperator]) {
        throw new Error(`unknown operator "${userOperator}" - should be one of $eq, $lte, $lt, $gt, $gte, $exists, $ne, $in, $nin, $size, $mod, $regex, $elemMatch, $type, $allMatch or $all`);
    }
    return matchers[userOperator](doc, userValue, parsedField, docFieldValue);
};

const fieldExists = (docFieldValue) => {
    return !is.nil(docFieldValue);
};

const fieldIsNotUndefined = (docFieldValue) => {
    return !is.undefined(docFieldValue);
};

const modField = (docFieldValue, userValue) => {
    const divisor = userValue[0];
    const mod = userValue[1];
    if (divisor === 0) {
        throw new Error("Bad divisor, cannot divide by zero");
    }

    if (parseInt(divisor, 10) !== divisor) {
        throw new Error("Divisor is not an integer");
    }

    if (parseInt(mod, 10) !== mod) {
        throw new Error("Modulus is not an integer");
    }

    if (parseInt(docFieldValue, 10) !== docFieldValue) {
        return false;
    }

    return docFieldValue % divisor === mod;
};

const arrayContainsValue = (docFieldValue, userValue) => {
    return userValue.some((val) => {
        if (docFieldValue instanceof Array) {
            return docFieldValue.indexOf(val) > -1;
        }

        return docFieldValue === val;
    });
};

const arrayContainsAllValues = (docFieldValue, userValue) => {
    return userValue.every((val) => {
        return docFieldValue.indexOf(val) > -1;
    });
};

const arraySize = (docFieldValue, userValue) => {
    return docFieldValue.length === userValue;
};

const regexMatch = (docFieldValue, userValue) => {
    const re = new RegExp(userValue);

    return re.test(docFieldValue);
};

const typeMatch = (docFieldValue, userValue) => {

    switch (userValue) {
        case "null":
            return is.null(docFieldValue);
        case "boolean":
            return is.boolean(docFieldValue);
        case "number":
            return is.number(docFieldValue);
        case "string":
            return is.string(docFieldValue);
        case "array":
            return docFieldValue instanceof Array;
        case "object":
            return ({}).toString.call(docFieldValue) === "[object Object]";
    }

    throw new Error(`${userValue} not supported as a type.` +
        "Please use one of object, string, array, number, boolean or null.");

};

const matchers = {
    $elemMatch(doc, userValue, parsedField, docFieldValue) {
        if (!is.array(docFieldValue)) {
            return false;
        }

        if (docFieldValue.length === 0) {
            return false;
        }

        if (typeof docFieldValue[0] === "object") {
            return docFieldValue.some((val) => {
                return rowFilter(val, userValue, Object.keys(userValue));
            });
        }

        return docFieldValue.some((val) => {
            return matchSelector(userValue, doc, parsedField, val);
        });
    },

    $allMatch(doc, userValue, parsedField, docFieldValue) {
        if (!is.array(docFieldValue)) {
            return false;
        }

        /* istanbul ignore next */
        if (docFieldValue.length === 0) {
            return false;
        }

        if (typeof docFieldValue[0] === "object") {
            return docFieldValue.every((val) => {
                return rowFilter(val, userValue, Object.keys(userValue));
            });
        }

        return docFieldValue.every((val) => {
            return matchSelector(userValue, doc, parsedField, val);
        });
    },

    $eq(doc, userValue, parsedField, docFieldValue) {
        return fieldIsNotUndefined(docFieldValue) && collate(docFieldValue, userValue) === 0;
    },

    $gte(doc, userValue, parsedField, docFieldValue) {
        return fieldIsNotUndefined(docFieldValue) && collate(docFieldValue, userValue) >= 0;
    },

    $gt(doc, userValue, parsedField, docFieldValue) {
        return fieldIsNotUndefined(docFieldValue) && collate(docFieldValue, userValue) > 0;
    },

    $lte(doc, userValue, parsedField, docFieldValue) {
        return fieldIsNotUndefined(docFieldValue) && collate(docFieldValue, userValue) <= 0;
    },

    $lt(doc, userValue, parsedField, docFieldValue) {
        return fieldIsNotUndefined(docFieldValue) && collate(docFieldValue, userValue) < 0;
    },

    $exists(doc, userValue, parsedField, docFieldValue) {
        //a field that is null is still considered to exist
        if (userValue) {
            return fieldIsNotUndefined(docFieldValue);
        }

        return !fieldIsNotUndefined(docFieldValue);
    },

    $mod(doc, userValue, parsedField, docFieldValue) {
        return fieldExists(docFieldValue) && modField(docFieldValue, userValue);
    },

    $ne(doc, userValue, parsedField, docFieldValue) {
        return userValue.every((neValue) => {
            return collate(docFieldValue, neValue) !== 0;
        });
    },
    $in(doc, userValue, parsedField, docFieldValue) {
        return fieldExists(docFieldValue) && arrayContainsValue(docFieldValue, userValue);
    },

    $nin(doc, userValue, parsedField, docFieldValue) {
        return fieldExists(docFieldValue) && !arrayContainsValue(docFieldValue, userValue);
    },

    $size(doc, userValue, parsedField, docFieldValue) {
        return fieldExists(docFieldValue) && arraySize(docFieldValue, userValue);
    },

    $all(doc, userValue, parsedField, docFieldValue) {
        return is.array(docFieldValue) && arrayContainsAllValues(docFieldValue, userValue);
    },

    $regex(doc, userValue, parsedField, docFieldValue) {
        return fieldExists(docFieldValue) && regexMatch(docFieldValue, userValue);
    },

    $type(doc, userValue, parsedField, docFieldValue) {
        return typeMatch(docFieldValue, userValue);
    }
};

export { filterInMemoryFields, createFieldSorter, rowFilter };

// return true if the given doc matches the supplied selector
const matchesSelector = (doc, selector) => {
    /* istanbul ignore if */
    if (typeof selector !== "object") {
        // match the CouchDB error message
        throw new Error("Selector error: expected a JSON object");
    }

    selector = massageSelector(selector);
    const row = {
        doc
    };

    const rowsMatched = filterInMemoryFields([row], { selector }, Object.keys(selector));
    return rowsMatched && rowsMatched.length === 1;
};

export { matchesSelector };
