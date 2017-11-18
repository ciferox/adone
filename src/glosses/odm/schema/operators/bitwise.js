const CastError = require("../../error/cast");

const {
    is
} = adone;

/*!
 * ignore
 */

function handleBitwiseOperator(val) {
    const _this = this;
    if (is.array(val)) {
        return val.map((v) => {
            return _castNumber(_this.path, v);
        });
    } else if (is.buffer(val)) {
        return val;
    }
    // Assume trying to cast to number
    return _castNumber(_this.path, val);
}

/*!
 * ignore
 */

function _castNumber(path, num) {
    const v = Number(num);
    if (isNaN(v)) {
        throw new CastError("number", num, path);
    }
    return v;
}

module.exports = handleBitwiseOperator;
