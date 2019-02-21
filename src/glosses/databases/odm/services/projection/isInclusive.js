const isDefiningProjection = require("./isDefiningProjection");

const {
    is
} = adone;

module.exports = function isInclusive(projection) {
    if (is.nil(projection)) {
        return false;
    }

    const props = Object.keys(projection);
    const numProps = props.length;
    if (numProps === 0) {
        return false;
    }

    for (let i = 0; i < numProps; ++i) {
        const prop = props[i];
        // If field is truthy (1, true, etc.) and not an object, then this
        // projection must be inclusive. If object, assume its $meta, $slice, etc.
        if (isDefiningProjection(projection[prop]) && Boolean(projection[prop])) {
            return true;
        }
    }

    return false;
};
