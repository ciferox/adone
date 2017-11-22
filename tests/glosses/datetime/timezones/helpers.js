const { is, datetime } = adone;
const getTimezoneOffset = Date.prototype.getTimezoneOffset;
const toTimeString = Date.prototype.toTimeString;
const parent = global;
const oldIntl = parent.Intl;

function getUTCOffset(m) {
    if (!is.undefined(m.utcOffset)) {
        return m.utcOffset();
    }
    return -m.zone();

}

const testYear = (name, expected) => {
    let len = expected.length,
        i,
        date, time, abbr, offset, m;

    expect(len).to.be.greaterThan(0);

    for (i = 0; i < len; i++) {
        date = expected[i][0];
        time = expected[i][1];
        abbr = expected[i][2];
        offset = expected[i][3];
        m = datetime(date).tz(name);
        assert.equal(m.format("HH:mm:ss"), time, `${date} should be ${time} ${abbr}`);
        assert.equal(getUTCOffset(m), -offset, `${date} should be ${offset} minutes offset in ${abbr}`);
        assert.equal(m.zoneAbbr(), abbr, `${date} should be ${abbr}`);
    }
};

function mockTimezoneOffset(name) {
    const zone = datetime.tz.zone(name);
    Date.prototype.getTimezoneOffset = function () {
        return zone.utcOffset(Number(this));
    };
}

function mockToTimeString(name, format) {
    Date.prototype.toTimeString = function () {
        return datetime.tz(Number(this), name).format(format || "HH:mm:ss [GMT]ZZ");
    };
}

const testGuess = (name, mostPopulatedFor) => {
    parent.Intl = undefined;

    if (mostPopulatedFor.offset) {
        mockTimezoneOffset(name);
        mockToTimeString(name);
        assert.equal(datetime.tz.guess(true), name);
    }

    if (mostPopulatedFor.abbr) {
        mockTimezoneOffset(name);
        mockToTimeString(name, "HH:mm:ss [GMT]ZZ (z)");
        assert.equal(datetime.tz.guess(true), name);
    }

    Date.prototype.getTimezoneOffset = getTimezoneOffset;
    Date.prototype.toTimeString = toTimeString;
    parent.Intl = oldIntl;
};

module.exports = {
    testYear,
    makeTestYear(name, expected) {
        return function () {
            testYear(name, expected);
        };
    },
    testGuess,
    makeTestGuess(name, mostPopulatedFor) {
        return function () {
            testGuess(name, mostPopulatedFor);
        };
    },

    getUTCOffset
};
