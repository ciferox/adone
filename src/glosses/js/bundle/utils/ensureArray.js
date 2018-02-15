const {
    is
} = adone;

export default function ensureArray(thing) {
    if (is.array(thing)) {
        return thing;
    }
    if (is.nil(thing)) {
        return [];
    }
    return [thing];
}
