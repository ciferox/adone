const __ = adone.getPrivate(adone.datetime);

const {
    format: { addFormatToken }
} = __;

// FORMATTING

addFormatToken("z", 0, 0, "zoneAbbr");
addFormatToken("zz", 0, 0, "zoneName");
