import Diff from "./base";
import { lineDiff } from "./line";

export const objectDiff = new Diff();
// Discriminate between two lines of pretty-printed, serialized JSON where one of them has a
// dangling comma and the other doesn't. Turns out including the dangling comma yields the nicest output:
objectDiff.useLongestToken = true;

objectDiff.tokenize = lineDiff.tokenize;
objectDiff.castInput = function (value) {
    const { undefinedReplacement } = this.options;

    return adone.is.string(value) ? value : JSON.stringify(canonicalizeObject(value), function (k, v) {
        if (adone.is.undefined(v)) {
            return undefinedReplacement;
        }

        return v;
    }, "  ");
};
objectDiff.equals = function (left, right) {
    return Diff.prototype.equals(left.replace(/,([\r\n])/g, "$1"), right.replace(/,([\r\n])/g, "$1"));
};

export function diffObject(oldObj, newObj, options) {
    return objectDiff.diff(oldObj, newObj, options);
}

// This function handles the presence of circular references by bailing out when encountering an
// object that is already on the "stack" of items being processed.
export function canonicalizeObject(obj, stack = [], replacementStack = []) {
    for (let i = 0; i < stack.length; i += 1) {
        if (stack[i] === obj) {
            return replacementStack[i];
        }
    }

    let canonicalizedObj;

    if (adone.is.array(obj)) {
        stack.push(obj);
        canonicalizedObj = new Array(obj.length);
        replacementStack.push(canonicalizedObj);
        for (let i = 0; i < obj.length; i += 1) {
            canonicalizedObj[i] = canonicalizeObject(obj[i], stack, replacementStack);
        }
        stack.pop();
        replacementStack.pop();
        return canonicalizedObj;
    }

    if (obj && obj.toJSON) {
        obj = obj.toJSON();
    }

    if (adone.is.plainObject(obj)) {
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
}
