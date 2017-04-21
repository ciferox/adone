import Diff from "./base";

export const cssDiff = new Diff();
cssDiff.tokenize = function (value) {
    return value.split(/([{}:;,]|\s+)/);
};

export function diffCSS(oldStr, newStr, callback) {
    return cssDiff.diff(oldStr, newStr, callback);
}
