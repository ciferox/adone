const { diff: { _: { Diff } } } = adone;

export const sentenceDiff = new Diff();

sentenceDiff.tokenize = (value) => value.split(/(\S.+?[.!?])(?=\s+|$)/);

export const diffSentences = (oldStr, newStr, callback) => sentenceDiff.diff(oldStr, newStr, callback);

