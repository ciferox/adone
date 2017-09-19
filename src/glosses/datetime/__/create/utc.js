const __ = adone.private(adone.datetime);

export default function createUTC(input, format, locale, strict) {
    return __.create.createLocalOrUTC(input, format, locale, strict, true).utc();
}
