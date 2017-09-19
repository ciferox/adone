const __ = adone.private(adone.datetime);

export default function createLocal(input, format, locale, strict) {
    return __.create.createLocalOrUTC(input, format, locale, strict, false);
}
