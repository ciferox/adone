const { is, util, database: { pouch: { __ } } } = adone;
const {
    util: {
        selector: {
            getKey,
            getValue,
            parseField,
            getFieldFromDoc,
            setFieldInDoc
        }
    },
    collate: {
        collate
    }
} = __;

// normalize the "sort" value
const massageSort = (sort) => {
    if (!is.array(sort)) {
        throw new Error("invalid sort json - should be an array");
    }
    return sort.map((sorting) => {
        if (is.string(sorting)) {
            const obj = {};
            obj[sorting] = "asc";
            return obj;
        }
        return sorting;

    });
};

const massageUseIndex = (useIndex) => {
    let cleanedUseIndex = [];
    if (is.string(useIndex)) {
        cleanedUseIndex.push(useIndex);
    } else {
        cleanedUseIndex = useIndex;
    }

    return cleanedUseIndex.map((name) => {
        return name.replace("_design/", "");
    });
};

const massageIndexDef = (indexDef) => {
    indexDef.fields = indexDef.fields.map((field) => {
        if (is.string(field)) {
            const obj = {};
            obj[field] = "asc";
            return obj;
        }
        return field;
    });
    return indexDef;
};

const getKeyFromDoc = (doc, index) => {
    const res = [];
    for (let i = 0; i < index.def.fields.length; i++) {
        const field = getKey(index.def.fields[i]);
        res.push(doc[field]);
    }
    return res;
};

// have to do this manually because REASONS. I don't know why
// CouchDB didn't implement inclusive_start
const filterInclusiveStart = (rows, targetValue, index) => {
    const indexFields = index.def.fields;
    let i;
    for (i = 0; i < rows.length; i++) {
        const row = rows[i];

        // shave off any docs at the beginning that are <= the
        // target value

        let docKey = getKeyFromDoc(row.doc, index);
        if (indexFields.length === 1) {
            docKey = docKey[0]; // only one field, not multi-field
        } else { // more than one field in index
            // in the case where e.g. the user is searching {$gt: {a: 1}}
            // but the index is [a, b], then we need to shorten the doc key
            while (docKey.length > targetValue.length) {
                docKey.pop();
            }
        }
        //ABS as we just looking for values that don't match
        if (Math.abs(collate(docKey, targetValue)) > 0) {
            // no need to filter any further; we're past the key
            break;
        }
    }
    return i > 0 ? rows.slice(i) : rows;
};

const reverseOptions = (opts) => {
    const newOpts = util.clone(opts);
    delete newOpts.startkey;
    delete newOpts.endkey;
    delete newOpts.inclusive_start;
    delete newOpts.inclusive_end;

    if ("endkey" in opts) {
        newOpts.startkey = opts.endkey;
    }
    if ("startkey" in opts) {
        newOpts.endkey = opts.startkey;
    }
    if ("inclusive_start" in opts) {
        newOpts.inclusive_end = opts.inclusive_start;
    }
    if ("inclusive_end" in opts) {
        newOpts.inclusive_start = opts.inclusive_end;
    }
    return newOpts;
};

const validateIndex = (index) => {
    const ascFields = index.fields.filter((field) => {
        return getValue(field) === "asc";
    });
    if (ascFields.length !== 0 && ascFields.length !== index.fields.length) {
        throw new Error("unsupported mixed sorting");
    }
};

const validateSort = (requestDef, index) => {
    if (index.defaultUsed && requestDef.sort) {
        const noneIdSorts = requestDef.sort.filter((sortItem) => {
            return Object.keys(sortItem)[0] !== "_id";
        }).map((sortItem) => {
            return Object.keys(sortItem)[0];
        });

        if (noneIdSorts.length > 0) {
            throw new Error(`Cannot sort on field(s) "${noneIdSorts.join(",")
            }" when using the default index`);
        }
    }

    if (index.defaultUsed) {
        // ?
    }
};

const validateFindRequest = (requestDef) => {
    if (typeof requestDef.selector !== "object") {
        throw new Error("you must provide a selector when you find()");
    }

    /*var selectors = requestDef.selector['$and'] || [requestDef.selector];
    for (var i = 0; i < selectors.length; i++) {
      var selector = selectors[i];
      var keys = Object.keys(selector);
      if (keys.length === 0) {
        throw new Error('invalid empty selector');
      }
      //var selection = selector[keys[0]];
      /*if (Object.keys(selection).length !== 1) {
        throw new Error('invalid selector: ' + JSON.stringify(selection) +
          ' - it must have exactly one key/value');
      }
    }*/
};

// determine the maximum number of fields
// we're going to need to query, e.g. if the user
// has selection ['a'] and sorting ['a', 'b'], then we
// need to use the longer of the two: ['a', 'b']
const getUserFields = (selector, sort) => {
    const selectorFields = Object.keys(selector);
    const sortFields = sort ? sort.map(getKey) : [];
    let userFields;
    if (selectorFields.length >= sortFields.length) {
        userFields = selectorFields;
    } else {
        userFields = sortFields;
    }

    if (sortFields.length === 0) {
        return {
            fields: userFields
        };
    }

    // sort according to the user's preferred sorting
    userFields = userFields.sort((left, right) => {
        let leftIdx = sortFields.indexOf(left);
        if (leftIdx === -1) {
            leftIdx = Number.MAX_VALUE;
        }
        let rightIdx = sortFields.indexOf(right);
        if (rightIdx === -1) {
            rightIdx = Number.MAX_VALUE;
        }
        return leftIdx < rightIdx ? -1 : leftIdx > rightIdx ? 1 : 0;
    });

    return {
        fields: userFields,
        sortOrder: sort.map(getKey)
    };
};


// e.g. ['a'], ['a', 'b'] is true, but ['b'], ['a', 'b'] is false
const oneArrayIsSubArrayOfOther = (left, right) => {
    for (let i = 0, len = Math.min(left.length, right.length); i < len; i++) {
        if (left[i] !== right[i]) {
            return false;
        }
    }
    return true;
};

// e.g.['a', 'b', 'c'], ['a', 'b'] is false
const oneArrayIsStrictSubArrayOfOther = (left, right) => {

    if (left.length > right.length) {
        return false;
    }

    return oneArrayIsSubArrayOfOther(left, right);
};

// same as above, but treat the left array as an unordered set
// e.g. ['b', 'a'], ['a', 'b', 'c'] is true, but ['c'], ['a', 'b', 'c'] is false
const oneSetIsSubArrayOfOther = (left, right) => {
    left = left.slice();
    for (let i = 0, len = right.length; i < len; i++) {
        const field = right[i];
        if (!left.length) {
            break;
        }
        const leftIdx = left.indexOf(field);
        if (leftIdx === -1) {
            return false;
        }
        left.splice(leftIdx, 1);

    }
    return true;
};

// Selects a list of fields defined in dot notation from one doc
// and copies them to a new doc. Like underscore _.pick but supports nesting.
const pick = (obj, arr) => {
    const res = {};
    for (let i = 0, len = arr.length; i < len; i++) {
        const parsedField = parseField(arr[i]);
        const value = getFieldFromDoc(obj, parsedField);
        if (!is.undefined(value)) {
            setFieldInDoc(res, parsedField, value);
        }
    }
    return res;
};

export {
    massageSort,
    validateIndex,
    validateFindRequest,
    validateSort,
    reverseOptions,
    filterInclusiveStart,
    massageIndexDef,
    getUserFields,
    massageUseIndex,
    oneArrayIsSubArrayOfOther,
    oneArrayIsStrictSubArrayOfOther,
    oneSetIsSubArrayOfOther,
    pick
};
