const { util, is } = adone;

const memoizeCompare = (leftHandOperand, rightHandOperand, memoizeMap) => {
    if (!memoizeMap || is.primitive(leftHandOperand) || is.primitive(rightHandOperand)) {
        return null;
    }
    const leftHandMap = memoizeMap.get(leftHandOperand);
    if (leftHandMap) {
        const result = leftHandMap.get(rightHandOperand);
        if (is.boolean(result)) {
            return result;
        }
    }
    return null;
};

const memoizeSet = (leftHandOperand, rightHandOperand, memoizeMap, result) => {
    // Technically, WeakMap keys can *only* be objects, not primitives.
    if (!memoizeMap || is.primitive(leftHandOperand) || is.primitive(rightHandOperand)) {
        return;
    }
    let leftHandMap = memoizeMap.get(leftHandOperand);
    if (leftHandMap) {
        leftHandMap.set(rightHandOperand, result);
    } else {
        leftHandMap = new WeakMap();
        leftHandMap.set(rightHandOperand, result);
        memoizeMap.set(leftHandOperand, leftHandMap);
    }
};

const iterableEqual = (leftHandOperand, rightHandOperand, options) => {
    const length = leftHandOperand.length;
    if (length !== rightHandOperand.length) {
        return false;
    }
    if (length === 0) {
        return true;
    }
    let index = -1;
    while (++index < length) {
        if (deepEqual(leftHandOperand[index], rightHandOperand[index], options) === false) {
            return false;
        }
    }
    return true;
};

const entriesEqual = (leftHandOperand, rightHandOperand, options) => {
    if (leftHandOperand.size !== rightHandOperand.size) {
        return false;
    }
    if (leftHandOperand.size === 0) {
        return true;
    }
    return iterableEqual(
        [...leftHandOperand.entries()].sort(),
        [...rightHandOperand.entries()].sort(),
        options
    );
};

const getGeneratorEntries = (generator) => {
    let generatorResult = generator.next();
    const accumulator = [generatorResult.value];
    while (generatorResult.done === false) {
        generatorResult = generator.next();
        accumulator.push(generatorResult.value);
    }
    return accumulator;
};

const generatorEqual = (leftHandOperand, rightHandOperand, options) => {
    return iterableEqual(
        getGeneratorEntries(leftHandOperand),
        getGeneratorEntries(rightHandOperand),
        options
    );
};

const getIteratorEntries = (target) => {
    if (is.iterable(target)) {
        return [...target];
    }
    return [];
};

const keysEqual = (leftHandOperand, rightHandOperand, keys, options) => {
    const { length } = keys;

    if (length === 0) {
        return true;
    }
    for (let i = 0; i < length; ++i) {
        if (deepEqual(leftHandOperand[keys[i]], rightHandOperand[keys[i]], options) === false) {
            return false;
        }
    }
    return true;
};

const objectEqual = (leftHandOperand, rightHandOperand, options) => {
    const leftHandKeys = util.keys(leftHandOperand, { followProto: true });
    const rightHandKeys = util.keys(rightHandOperand, { followProto: true });

    if (leftHandKeys.length && leftHandKeys.length === rightHandKeys.length) {
        leftHandKeys.sort();
        rightHandKeys.sort();
        if (iterableEqual(leftHandKeys, rightHandKeys) === false) {
            return false;
        }
        return keysEqual(leftHandOperand, rightHandOperand, leftHandKeys, options);
    }

    const leftHandEntries = getIteratorEntries(leftHandOperand);
    const rightHandEntries = getIteratorEntries(rightHandOperand);
    if (leftHandEntries.length && leftHandEntries.length === rightHandEntries.length) {
        leftHandEntries.sort();
        rightHandEntries.sort();
        return iterableEqual(leftHandEntries, rightHandEntries, options);
    }

    return leftHandKeys.length === 0 && leftHandEntries.length === 0 &&
           rightHandKeys.length === 0 && rightHandEntries.length === 0;
};

const simpleEqual = (leftHandOperand, rightHandOperand) => {
    // Equal references (except for Numbers) can be returned early
    if (leftHandOperand === rightHandOperand) {
        // Handle +-0 cases
        return leftHandOperand !== 0 || 1 / leftHandOperand === 1 / rightHandOperand;
    }

    // handle NaN cases
    if (
        leftHandOperand !== leftHandOperand &&  // eslint-disable-line no-self-compare
        rightHandOperand !== rightHandOperand  // eslint-disable-line no-self-compare
    ) {
        return true;
    }

    // Anything that is not an 'object', i.e. symbols, functions, booleans, numbers,
    // strings, and undefined, can be compared by reference.
    if (is.primitive(leftHandOperand) || is.primitive(rightHandOperand)) {
        // Easy out b/c it would have passed the first equality check
        return false;
    }
    return null;
};

const extensiveDeepEqualByType = (leftHandOperand, rightHandOperand, leftHandType, options) => {
    switch (leftHandType) {
        case "String":
        case "Number":
        case "Boolean":
        case "Date": {
            // If these types are their instance types (e.g. `new Number`) then re-deepEqual against their values
            return deepEqual(leftHandOperand.valueOf(), rightHandOperand.valueOf());
        }
        case "Promise":
        case "Symbol":
        case "function":
        case "WeakMap":
        case "WeakSet":
        case "Error": {
            return leftHandOperand === rightHandOperand;
        }
        case "Arguments":
        case "Int8Array":
        case "Uint8Array":
        case "Uint8ClampedArray":
        case "Int16Array":
        case "Uint16Array":
        case "Int32Array":
        case "Uint32Array":
        case "Float32Array":
        case "Float64Array":
        case "Array": {
            return iterableEqual(leftHandOperand, rightHandOperand, options);
        }
        case "RegExp": {
            return leftHandOperand.toString() === rightHandOperand.toString();
        }
        case "Generator": {
            return generatorEqual(leftHandOperand, rightHandOperand, options);
        }
        case "DataView": {
            return iterableEqual(
                new Uint8Array(leftHandOperand.buffer),
                new Uint8Array(rightHandOperand.buffer),
                options
            );
        }
        case "ArrayBuffer": {
            return iterableEqual(
                new Uint8Array(leftHandOperand),
                new Uint8Array(rightHandOperand),
                options
            );
        }
        case "Set": {
            return entriesEqual(leftHandOperand, rightHandOperand, options);
        }
        case "Map": {
            return entriesEqual(leftHandOperand, rightHandOperand, options);
        }
        default: {
            return objectEqual(leftHandOperand, rightHandOperand, options);
        }
    }
};


const extensiveDeepEqual = (leftHandOperand, rightHandOperand, options = {}) => {
    options.memoize = options.memoize === false ? false : options.memoize || new WeakMap();
    const comparator = options && options.comparator;

    const memoizeResultLeft = memoizeCompare(leftHandOperand, rightHandOperand, options.memoize);
    if (!is.null(memoizeResultLeft)) {
        return memoizeResultLeft;
    }
    const memoizeResultRight = memoizeCompare(rightHandOperand, leftHandOperand, options.memoize);
    if (!is.null(memoizeResultRight)) {
        return memoizeResultRight;
    }

    if (comparator) {
        const comparatorResult = comparator(leftHandOperand, rightHandOperand);
        // Comparators may return null, in which case we want to go back to default behavior.
        if (is.boolean(comparatorResult)) {
            memoizeSet(leftHandOperand, rightHandOperand, options.memoize, comparatorResult);
            return comparatorResult;
        }
        // To allow comparators to override *any* behavior, we ran them first. Since it didn't decide
        // what to do, we need to make sure to return the basic tests first before we move on.
        const simpleResult = simpleEqual(leftHandOperand, rightHandOperand);
        if (!is.null(simpleResult)) {
            // Don't memoize this, it takes longer to set/retrieve than to just compare.
            return simpleResult;
        }
    }

    const leftHandType = util.typeOf(leftHandOperand);
    if (leftHandType !== util.typeOf(rightHandOperand)) {
        memoizeSet(leftHandOperand, rightHandOperand, options.memoize, false);
        return false;
    }

    // Temporarily set the operands in the memoize object to prevent blowing the stack
    memoizeSet(leftHandOperand, rightHandOperand, options.memoize, true);

    const result = extensiveDeepEqualByType(
        leftHandOperand,
        rightHandOperand,
        leftHandType,
        options
    );
    memoizeSet(leftHandOperand, rightHandOperand, options.memoize, result);
    return result;
};

export default function deepEqual(leftHandOperand, rightHandOperand, options) {
    if (options && options.comparator) {
        return extensiveDeepEqual(leftHandOperand, rightHandOperand, options);
    }

    const simpleResult = simpleEqual(leftHandOperand, rightHandOperand);
    if (simpleResult !== null) {
        return simpleResult;
    }

    // Deeper comparisons are pushed through to a larger function
    return extensiveDeepEqual(leftHandOperand, rightHandOperand, options);
}
