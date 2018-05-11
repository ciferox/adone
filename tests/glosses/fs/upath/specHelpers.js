const {
    lodash: _,
    is
} = adone;

const _B = require("uberscore");
const l = new _B.Logger("uRequire/specHelpers");
const equal = function (a, b) {
    return expect(a).to.equal(b);
};
const notEqual = function (a, b) {
    return expect(a).to.not.equal(b);
};
const ok = function (a) {
    return expect(a).to.be.ok;
};
const notOk = function (a) {
    return expect(a).to.be.not.ok;
};
const tru = function (a) {
    return expect(a).to.be.true;
};
const fals = function (a) {
    return expect(a).to.be.false;
};
const are = function (name, asEqual) {
    if (is.nil(asEqual)) {
        asEqual = true;
    }
    return function (a, b) {
        let path;
        const isEq = _B[name](a, b, {
            path: path = [],
            allProps: true,
            exclude: ["inspect"]
        });
        if (asEqual) {
            if (!isEq) {
                l.warn(` \nDiscrepancy, expected \`true\` from _B.${name} \n at path: `, path.join("."), " \n * left value = ", _B.getp(a, path), "\n * right value =", _B.getp(b, path), " \n\n * left Object = \n", a, " \n\n * right Object = \n", b);
            }
            return expect(isEq).to.be.true;
        }
        if (isEq) {
            l.warn(`Discrepancy, expected \`false\` from _B.${name}, but its \`true\`.`);
        }
        return expect(isEq).to.be.false;

    };
};
const createEqualSet = function (asEqual) {
    return function (result, expected) {
        const isEq = _B.isEqualArraySet(result, expected);
        if (asEqual) {
            if (!isEq) {
                l.warn("\n _B.isEqualArraySet expected `true`", "\n result \\ expected \n", _.difference(result, expected), "\n expected \\ result \n", _.difference(expected, result));
            }
            return expect(isEq).to.be.true;
        }
        if (isEq) {
            l.warn("\n _B.isEqualArraySet expected `false`, got `true`");
        }
        return expect(isEq).to.be.false;

    };
};
const equalSet = createEqualSet(true);
const notEqualSet = createEqualSet(false);
const deepEqual = are("isEqual");
const notDeepEqual = are("isEqual", false);
const exact = are("isExact");
const notExact = are("isExact", false);
const iqual = are("isIqual");
const notIqual = are("isIqual", false);
const ixact = are("isIxact");
const notIxact = are("isIxact", false);
const like = are("isLike");
const notLike = are("isLike", false);
const likeBA = function (a, b) {
    return like(b, a);
};
const notLikeBA = function (a, b) {
    return notLike(b, a);
};
module.exports = {
    equal,
    notEqual,
    tru,
    fals,
    ok,
    notOk,
    deepEqual,
    notDeepEqual,
    exact,
    notExact,
    iqual,
    notIqual,
    ixact,
    notIxact,
    like,
    notLike,
    likeBA,
    notLikeBA,
    equalSet,
    notEqualSet
};
