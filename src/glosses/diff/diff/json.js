const { is, diff: { _: { Diff, lineDiff } } } = adone;

// This function handles the presence of circular references by bailing out when encountering an
// object that is already on the "stack" of items being processed.
export const canonicalizeObject = (obj, stack = [], replacementStack = []) => {
    for (let i = 0; i < stack.length; i += 1) {
        if (stack[i] === obj) {
            return replacementStack[i];
        }
    }

    let canonicalizedObj;

    if (is.array(obj)) {
        stack.push(obj);
        canonicalizedObj = new Array(obj.length);
        replacementStack.push(canonicalizedObj);
        for (let i = 0; i < obj.length; ++i) {
            canonicalizedObj[i] = canonicalizeObject(obj[i], stack, replacementStack);
        }
        stack.pop();
        replacementStack.pop();
        return canonicalizedObj;
    }

    if (obj && obj.toJSON) {
        obj = obj.toJSON();
    }

    if (is.plainObject(obj)) {
        stack.push(obj);
        canonicalizedObj = {};
        replacementStack.push(canonicalizedObj);
        const sortedKeys = [];

        for (const key in obj) {
            /* istanbul ignore else */
            if (obj.hasOwnProperty(key)) {
                sortedKeys.push(key);
            }
        }
        sortedKeys.sort();
        for (let i = 0; i < sortedKeys.length; i += 1) {
            const key = sortedKeys[i];
            canonicalizedObj[key] = canonicalizeObject(obj[key], stack, replacementStack);
        }
        stack.pop();
        replacementStack.pop();
    } else {
        canonicalizedObj = obj;
    }
    return canonicalizedObj;
};

export const jsonDiff = new Diff();
// Discriminate between two lines of pretty-printed, serialized JSON where one of them has a
// dangling comma and the other doesn't. Turns out including the dangling comma yields the nicest output:
jsonDiff.useLongestToken = true;

jsonDiff.tokenize = lineDiff.tokenize;

jsonDiff.castInput = function (value) {
    const { undefinedReplacement } = this.options;

    return is.string(value) ? value : JSON.stringify(canonicalizeObject(value), (k, v) => {
        if (is.undefined(v)) {
            return undefinedReplacement;
        }

        return v;
    }, "  ");
};

jsonDiff.equals = (left, right) => {
    return Diff.prototype.equals.call(
        jsonDiff,
        left.replace(/,([\r\n])/g, "$1"),
        right.replace(/,([\r\n])/g, "$1")
    );
};

export const diffJson = (oldObj, newObj, options) => jsonDiff.diff(oldObj, newObj, options);
