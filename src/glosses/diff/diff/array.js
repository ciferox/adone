const { identity, diff: { _: { Diff } } } = adone;

export const arrayDiff = new Diff();

arrayDiff.tokenize = arrayDiff.join = function (value) {
    return value.slice();
};

arrayDiff.removeEmpty = identity;

export const diffArrays = (oldArr, newArr, callback) => arrayDiff.diff(oldArr, newArr, callback);
