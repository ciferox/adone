const {
    is
} = adone;

module.exports = function isDefiningProjection(val) {
    if (is.nil(val)) {
        // `undefined` or `null` become exclusive projections
        return true;
    }
    if (typeof val === "object") {
        // Only cases where a value does **not** define whether the whole projection
        // is inclusive or exclusive are `$meta` and `$slice`.
        return !("$meta" in val) && !("$slice" in val);
    }
    return true;
};
