const {
    is
} = adone;

module.exports = function (val) {
    if (!is.number(val) && !is.string(val)) {
        throw new Error("$type parameter must be number or string");
    }

    return val;
};
