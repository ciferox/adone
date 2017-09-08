const {
    is,
    util,
    database: { pouch }
} = adone;

const {
    plugin: { find: plugin }
} = pouch;

const {
    util: {
        selector: {
            getKey,
            compare
        }
    }
} = adone.private(pouch);

const {
    adapter: {
        local: {
            util: {
                getUserFields,
                oneArrayIsStrictSubArrayOfOther,
                oneArrayIsSubArrayOfOther,
                oneSetIsSubArrayOfOther
            }
        }
    }
} = plugin;

const arrayToObject = (arr) => {
    const res = {};
    for (let i = 0, len = arr.length; i < len; i++) {
        res[arr[i]] = true;
    }
    return res;
};

// couchdb lowest collation value
const COLLATE_LO = null;

// couchdb highest collation value (TODO: well not really, but close enough amirite)
const COLLATE_HI = { "\uffff": {} };

// couchdb second-lowest collation value

const checkFieldInIndex = (index, field) => {
    const indexFields = index.def.fields.map(getKey);
    for (let i = 0, len = indexFields.length; i < len; i++) {
        const indexField = indexFields[i];
        if (field === indexField) {
            return true;
        }
    }
    return false;
};

// so when you do e.g. $eq/$eq, we can do it entirely in the database.
// but when you do e.g. $gt/$eq, the first part can be done
// in the database, but the second part has to be done in-memory,
// because $gt has forced us to lose precision.
// so that's what this determines
const userOperatorLosesPrecision = (selector, field) => {
    const matcher = selector[field];
    const userOperator = getKey(matcher);

    return userOperator !== "$eq";
};

// sort the user fields by their position in the index,
// if they're in the index
const sortFieldsByIndex = (userFields, index) => {
    const indexFields = index.def.fields.map(getKey);

    return userFields.slice().sort((a, b) => {
        let aIdx = indexFields.indexOf(a);
        let bIdx = indexFields.indexOf(b);
        if (aIdx === -1) {
            aIdx = Number.MAX_VALUE;
        }
        if (bIdx === -1) {
            bIdx = Number.MAX_VALUE;
        }
        return compare(aIdx, bIdx);
    });
};

// first pass to try to find fields that will need to be sorted in-memory
const getBasicInMemoryFields = (index, selector, userFields) => {

    userFields = sortFieldsByIndex(userFields, index);

    // check if any of the user selectors lose precision
    let needToFilterInMemory = false;
    for (let i = 0, len = userFields.length; i < len; i++) {
        const field = userFields[i];
        if (needToFilterInMemory || !checkFieldInIndex(index, field)) {
            return userFields.slice(i);
        }
        if (i < len - 1 && userOperatorLosesPrecision(selector, field)) {
            needToFilterInMemory = true;
        }
    }
    return [];
};

const getInMemoryFieldsFromNe = (selector) => {
    const fields = [];
    Object.keys(selector).forEach((field) => {
        const matcher = selector[field];
        Object.keys(matcher).forEach((operator) => {
            if (operator === "$ne") {
                fields.push(field);
            }
        });
    });
    return fields;
};

const getInMemoryFields = (coreInMemoryFields, index, selector, userFields) => {
    const result = util.flatten([
        // in-memory fields reported as necessary by the query planner
        coreInMemoryFields,
        // combine with another pass that checks for any we may have missed
        getBasicInMemoryFields(index, selector, userFields),
        // combine with another pass that checks for $ne's
        getInMemoryFieldsFromNe(selector)
    ], { depth: Infinity });

    return sortFieldsByIndex(util.unique(result), index);
};

// check that at least one field in the user's query is represented
// in the index. order matters in the case of sorts
const checkIndexFieldsMatch = (indexFields, sortOrder, fields) => {
    if (sortOrder) {
        // array has to be a strict subarray of index array. furthermore,
        // the sortOrder fields need to all be represented in the index
        const sortMatches = oneArrayIsStrictSubArrayOfOther(sortOrder, indexFields);
        const selectorMatches = oneArrayIsSubArrayOfOther(fields, indexFields);

        return sortMatches && selectorMatches;
    }

    // all of the user's specified fields still need to be
    // on the left side of the index array, although the order
    // doesn't matter
    return oneSetIsSubArrayOfOther(fields, indexFields);
};

const logicalMatchers = ["$eq", "$gt", "$gte", "$lt", "$lte"];
const isNonLogicalMatcher = (matcher) => {
    return logicalMatchers.indexOf(matcher) === -1;
};

// check all the index fields for usages of '$ne'
// e.g. if the user queries {foo: {$ne: 'foo'}, bar: {$eq: 'bar'}},
// then we can neither use an index on ['foo'] nor an index on
// ['foo', 'bar'], but we can use an index on ['bar'] or ['bar', 'foo']
const checkFieldsLogicallySound = (indexFields, selector) => {
    const firstField = indexFields[0];
    const matcher = selector[firstField];

    if (is.undefined(matcher)) {
        return true;
    }

    const hasLogicalOperator = Object.keys(matcher).some((matcherKey) => {
        return !(isNonLogicalMatcher(matcherKey));
    });

    if (!hasLogicalOperator) {
        return false;
    }

    const isInvalidNe = Object.keys(matcher).length === 1 &&
        getKey(matcher) === "$ne";

    return !isInvalidNe;
};

const checkIndexMatches = (index, sortOrder, fields, selector) => {

    const indexFields = index.def.fields.map(getKey);

    const fieldsMatch = checkIndexFieldsMatch(indexFields, sortOrder, fields);

    if (!fieldsMatch) {
        return false;
    }

    return checkFieldsLogicallySound(indexFields, selector);
};

//
// the algorithm is very simple:
// take all the fields the user supplies, and if those fields
// are a strict subset of the fields in some index,
// then use that index
//
//
const findMatchingIndexes = (selector, userFields, sortOrder, indexes) => {

    return indexes.reduce((res, index) => {
        const indexMatches = checkIndexMatches(index, sortOrder, userFields, selector);
        if (indexMatches) {
            res.push(index);
        }
        return res;
    }, []);
};

// find the best index, i.e. the one that matches the most fields
// in the user's query
const findBestMatchingIndex = (selector, userFields, sortOrder, indexes, useIndex) => {

    const matchingIndexes = findMatchingIndexes(selector, userFields, sortOrder, indexes);

    if (matchingIndexes.length === 0) {
        if (useIndex) {
            throw {
                error: "no_usable_index",
                message: "There is no index available for this selector."
            };
        }
        //return `all_docs` as a default index;
        //I'm assuming that _all_docs is always first
        const defaultIndex = indexes[0];
        defaultIndex.defaultUsed = true;
        return defaultIndex;
    }
    if (matchingIndexes.length === 1 && !useIndex) {
        return matchingIndexes[0];
    }

    const userFieldsMap = arrayToObject(userFields);

    const scoreIndex = (index) => {
        const indexFields = index.def.fields.map(getKey);
        let score = 0;
        for (let i = 0, len = indexFields.length; i < len; i++) {
            const indexField = indexFields[i];
            if (userFieldsMap[indexField]) {
                score++;
            }
        }
        return score;
    };

    if (useIndex) {
        const useIndexDdoc = `_design/${useIndex[0]}`;
        const useIndexName = useIndex.length === 2 ? useIndex[1] : false;
        const index = matchingIndexes.find((index) => {
            if (useIndexName && index.ddoc === useIndexDdoc && useIndexName === index.name) {
                return true;
            }

            if (index.ddoc === useIndexDdoc) {
                return true;
            }

            return false;
        });

        if (!index) {
            throw {
                error: "unknown_error",
                message: "Could not find that index or could not use that index for the query"
            };
        }
        return index;
    }

    return util.max(matchingIndexes, scoreIndex);
};

const getSingleFieldQueryOptsFor = (userOperator, userValue) => {
    switch (userOperator) {
        case "$eq":
            return { key: userValue };
        case "$lte":
            return { endkey: userValue };
        case "$gte":
            return { startkey: userValue };
        case "$lt":
            return {
                endkey: userValue,
                inclusive_end: false
            };
        case "$gt":
            return {
                startkey: userValue,
                inclusive_start: false
            };
    }
};

const getSingleFieldCoreQueryPlan = (selector, index) => {
    const field = getKey(index.def.fields[0]);
    //ignoring this because the test to exercise the branch is skipped at the moment
    /* istanbul ignore next */
    const matcher = selector[field] || {};
    const inMemoryFields = [];

    const userOperators = Object.keys(matcher);

    let combinedOpts;

    userOperators.forEach((userOperator) => {

        if (isNonLogicalMatcher(userOperator)) {
            inMemoryFields.push(field);
            return;
        }

        const userValue = matcher[userOperator];

        const newQueryOpts = getSingleFieldQueryOptsFor(userOperator, userValue);

        if (combinedOpts) {
            combinedOpts = adone.o(combinedOpts, newQueryOpts);
        } else {
            combinedOpts = newQueryOpts;
        }
    });

    return {
        queryOpts: combinedOpts,
        inMemoryFields
    };
};

const getMultiFieldCoreQueryPlan = (userOperator, userValue) => {
    switch (userOperator) {
        case "$eq":
            return {
                startkey: userValue,
                endkey: userValue
            };
        case "$lte":
            return {
                endkey: userValue
            };
        case "$gte":
            return {
                startkey: userValue
            };
        case "$lt":
            return {
                endkey: userValue,
                inclusive_end: false
            };
        case "$gt":
            return {
                startkey: userValue,
                inclusive_start: false
            };
    }
};

const getMultiFieldQueryOpts = (selector, index) => {

    const indexFields = index.def.fields.map(getKey);

    let inMemoryFields = [];
    const startkey = [];
    const endkey = [];
    let inclusiveStart;
    let inclusiveEnd;


    const finish = (i) => {

        if (inclusiveStart !== false) {
            startkey.push(COLLATE_LO);
        }
        if (inclusiveEnd !== false) {
            endkey.push(COLLATE_HI);
        }
        // keep track of the fields where we lost specificity,
        // and therefore need to filter in-memory
        inMemoryFields = indexFields.slice(i);
    };

    for (let i = 0, len = indexFields.length; i < len; i++) {
        const indexField = indexFields[i];

        const matcher = selector[indexField];

        if (!matcher || !Object.keys(matcher).length) { // fewer fields in user query than in index
            finish(i);
            break;
        } else if (i > 0) {
            if (Object.keys(matcher).some(isNonLogicalMatcher)) { // non-logical are ignored
                finish(i);
                break;
            }
            const usingGtlt = (
                "$gt" in matcher || "$gte" in matcher ||
                "$lt" in matcher || "$lte" in matcher);
            const previousKeys = Object.keys(selector[indexFields[i - 1]]);
            const previousWasEq = is.equalArrays(previousKeys, ["$eq"]);
            const previousWasSame = is.equalArrays(previousKeys, Object.keys(matcher));
            const gtltLostSpecificity = usingGtlt && !previousWasEq && !previousWasSame;
            if (gtltLostSpecificity) {
                finish(i);
                break;
            }
        }

        const userOperators = Object.keys(matcher);

        let combinedOpts = null;

        for (let j = 0; j < userOperators.length; j++) {
            const userOperator = userOperators[j];
            const userValue = matcher[userOperator];

            const newOpts = getMultiFieldCoreQueryPlan(userOperator, userValue);

            if (combinedOpts) {
                combinedOpts = adone.o(combinedOpts, newOpts);
            } else {
                combinedOpts = newOpts;
            }
        }

        startkey.push("startkey" in combinedOpts ? combinedOpts.startkey : COLLATE_LO);
        endkey.push("endkey" in combinedOpts ? combinedOpts.endkey : COLLATE_HI);
        if ("inclusive_start" in combinedOpts) {
            inclusiveStart = combinedOpts.inclusive_start;
        }
        if ("inclusive_end" in combinedOpts) {
            inclusiveEnd = combinedOpts.inclusive_end;
        }
    }

    const res = {
        startkey,
        endkey
    };

    if (!is.undefined(inclusiveStart)) {
        res.inclusive_start = inclusiveStart;
    }
    if (!is.undefined(inclusiveEnd)) {
        res.inclusive_end = inclusiveEnd;
    }

    return {
        queryOpts: res,
        inMemoryFields
    };
};

const getDefaultQueryPlan = (selector) => {
    //using default index, so all fields need to be done in memory
    return {
        queryOpts: { startkey: null },
        inMemoryFields: [Object.keys(selector)]
    };
};

const getCoreQueryPlan = (selector, index) => {
    if (index.defaultUsed) {
        return getDefaultQueryPlan(selector, index);
    }

    if (index.def.fields.length === 1) {
        // one field in index, so the value was indexed as a singleton
        return getSingleFieldCoreQueryPlan(selector, index);
    }
    // else index has multiple fields, so the value was indexed as an array
    return getMultiFieldQueryOpts(selector, index);
};

const planQuery = (request, indexes) => {

    const selector = request.selector;
    const sort = request.sort;

    const userFieldsRes = getUserFields(selector, sort);

    const userFields = userFieldsRes.fields;
    const sortOrder = userFieldsRes.sortOrder;
    const index = findBestMatchingIndex(selector, userFields, sortOrder, indexes, request.use_index);

    const coreQueryPlan = getCoreQueryPlan(selector, index);
    const queryOpts = coreQueryPlan.queryOpts;
    const coreInMemoryFields = coreQueryPlan.inMemoryFields;

    const inMemoryFields = getInMemoryFields(coreInMemoryFields, index, selector, userFields);

    const res = {
        queryOpts,
        index,
        inMemoryFields
    };
    return res;
};

export default planQuery;
