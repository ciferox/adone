const { identity, diff: { _: { Diff } } } = adone;

export const arrayDiff = new Diff();

arrayDiff.tokenize = function (value) {
    return value.slice();
};

arrayDiff.join = arrayDiff.removeEmpty = identity;

export const diffArrays = (oldArr, newArr, callback) => arrayDiff.diff(oldArr, newArr, callback);
