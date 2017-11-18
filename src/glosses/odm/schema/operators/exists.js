const {
    is
} = adone;

module.exports = function (val) {
    if (!is.boolean(val)) {
        throw new Error("$exists parameter must be a boolean!");
    }

    return val;
};
