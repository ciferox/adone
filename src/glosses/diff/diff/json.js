import Diff from "./base";
import { lineDiff } from "./line";

const {
    is
} = adone;

const objectPrototypeToString = Object.prototype.toString;


export const jsonDiff = new Diff();
// Discriminate between two lines of pretty-printed, serialized JSON where one of them has a
// dangling comma and the other doesn't. Turns out including the dangling comma yields the nicest output:
jsonDiff.useLongestToken = true;

jsonDiff.tokenize = lineDiff.tokenize;
jsonDiff.castInput = function (value) {
    const { undefinedReplacement, stringifyReplacer = (k, v) => is.undefined(v) ? undefinedReplacement : v } = this.options;

    return is.string(value) ? value : JSON.stringify(canonicalize(value, null, null, stringifyReplacer), stringifyReplacer, "  ");
};
jsonDiff.equals = function (left, right) {
    return Diff.prototype.equals.call(jsonDiff, left.replace(/,([\r\n])/g, "$1"), right.replace(/,([\r\n])/g, "$1"));
};

export function diffJson(oldObj, newObj, options) {
    return jsonDiff.diff(oldObj, newObj, options); 
}

// This function handles the presence of circular references by bailing out when encountering an
// object that is already on the "stack" of items being processed. Accepts an optional replacer
export function canonicalize(obj, stack, replacementStack, replacer, key) {
    stack = stack || [];
    replacementStack = replacementStack || [];

    if (replacer) {
        obj = replacer(key, obj);
    }

    let i;

    for (i = 0; i < stack.length; i += 1) {
        if (stack[i] === obj) {
            return replacementStack[i];
        }
    }

    let canonicalizedObj;

    if (objectPrototypeToString.call(obj) === "[object Array]") {
        stack.push(obj);
        canonicalizedObj = new Array(obj.length);
        replacementStack.push(canonicalizedObj);
        for (i = 0; i < obj.length; i += 1) {
            canonicalizedObj[i] = canonicalize(obj[i], stack, replacementStack, replacer, key);
        }
        stack.pop();
        replacementStack.pop();
        return canonicalizedObj;
    }

    if (obj && obj.toJSON) {
        obj = obj.toJSON();
    }

    if (typeof obj === "object" && !is.null(obj)) {
        stack.push(obj);
        canonicalizedObj = {};
        replacementStack.push(canonicalizedObj);
        const sortedKeys = [];
        let key;
        for (key in obj) {
            /* istanbul ignore else */
            if (obj.hasOwnProperty(key)) {
                sortedKeys.push(key);
            }
        }
        sortedKeys.sort();
        for (i = 0; i < sortedKeys.length; i += 1) {
            key = sortedKeys[i];
            canonicalizedObj[key] = canonicalize(obj[key], stack, replacementStack, replacer, key);
        }
        stack.pop();
        replacementStack.pop();
    } else {
        canonicalizedObj = obj;
    }
    return canonicalizedObj;
}
