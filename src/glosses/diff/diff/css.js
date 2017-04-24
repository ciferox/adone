const { diff: { _: { Diff } } } = adone;

export const cssDiff = new Diff();

cssDiff.tokenize = (value) => value.split(/([{}:;,]|\s+)/);

export const diffCSS = (oldStr, newStr, callback) => cssDiff.diff(oldStr, newStr, callback);
