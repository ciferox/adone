const __ = adone.getPrivate(adone.datetime);

export default function createUTC(input, format, locale, strict) {
    return __.create.createLocalOrUTC(input, format, locale, strict, true).utc();
}
