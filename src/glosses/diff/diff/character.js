const { diff: { _: { Diff } } } = adone;

export const characterDiff = new Diff();

export const diffChars = (oldStr, newStr, options) => characterDiff.diff(oldStr, newStr, options);
