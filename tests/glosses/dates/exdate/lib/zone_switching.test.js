import { isNearSpringDST } from "../helpers/dst";

describe("zone switching", () => {
    before(() => {
        adone.date.locale("en");
    });

    it("local to utc, keepLocalTime = true", () => {
        const m = adone.date();
        const fmt = "YYYY-DD-MM HH:mm:ss";
        assert.equal(m.clone().utc(true).format(fmt), m.format(fmt), "local to utc failed to keep local time");
    });

    it("local to utc, keepLocalTime = false", () => {
        const m = adone.date();
        assert.equal(m.clone().utc().valueOf(), m.valueOf(), "local to utc failed to keep utc time (implicit)");
        assert.equal(m.clone().utc(false).valueOf(), m.valueOf(), "local to utc failed to keep utc time (explicit)");
    });

    it("local to zone, keepLocalTime = true", () => {
        const m = adone.date();
        const fmt = "YYYY-DD-MM HH:mm:ss";
        let z;

        // Apparently there is -12:00 and +14:00
        // http://en.wikipedia.org/wiki/UTC+14:00
        // http://en.wikipedia.org/wiki/UTC-12:00
        for (z = -12; z <= 14; ++z) {
            assert.equal(m.clone().utcOffset(z * 60, true).format(fmt), m.format(fmt),
                    `local to utcOffset(${z}:00) failed to keep local time`);
        }
    });

    it("local to zone, keepLocalTime = false", () => {
        const m = adone.date();
        let z;

        // Apparently there is -12:00 and +14:00
        // http://en.wikipedia.org/wiki/UTC+14:00
        // http://en.wikipedia.org/wiki/UTC-12:00
        for (z = -12; z <= 14; ++z) {
            assert.equal(m.clone().utcOffset(z * 60).valueOf(), m.valueOf(),
                    `local to utcOffset(${z}:00) failed to keep utc time (implicit)`);
            assert.equal(m.clone().utcOffset(z * 60, false).valueOf(), m.valueOf(),
                    `local to utcOffset(${z}:00) failed to keep utc time (explicit)`);
        }
    });

    it("utc to local, keepLocalTime = true", () => {
        // Don't test near the spring DST transition
        if (isNearSpringDST()) {
            expect(0);
            return;
        }

        const um = adone.date.utc();
        const fmt = "YYYY-DD-MM HH:mm:ss";

        assert.equal(um.clone().local(true).format(fmt), um.format(fmt), "utc to local failed to keep local time");
    });

    it("utc to local, keepLocalTime = false", () => {
        const um = adone.date.utc();
        assert.equal(um.clone().local().valueOf(), um.valueOf(), "utc to local failed to keep utc time (implicit)");
        assert.equal(um.clone().local(false).valueOf(), um.valueOf(), "utc to local failed to keep utc time (explicit)");
    });

    it("zone to local, keepLocalTime = true", () => {
        // Don't test near the spring DST transition
        if (isNearSpringDST()) {
            expect(0);
            return;
        }

        const m = adone.date();
        const fmt = "YYYY-DD-MM HH:mm:ss";
        let z;

        // Apparently there is -12:00 and +14:00
        // http://en.wikipedia.org/wiki/UTC+14:00
        // http://en.wikipedia.org/wiki/UTC-12:00
        for (z = -12; z <= 14; ++z) {
            m.utcOffset(z * 60);

            assert.equal(m.clone().local(true).format(fmt), m.format(fmt),
                    `utcOffset(${z}:00) to local failed to keep local time`);
        }
    });

    it("zone to local, keepLocalTime = false", () => {
        const m = adone.date();
        let z;

        // Apparently there is -12:00 and +14:00
        // http://en.wikipedia.org/wiki/UTC+14:00
        // http://en.wikipedia.org/wiki/UTC-12:00
        for (z = -12; z <= 14; ++z) {
            m.utcOffset(z * 60);

            assert.equal(m.clone().local(false).valueOf(), m.valueOf(),
                    `utcOffset(${z}:00) to local failed to keep utc time (explicit)`);
            assert.equal(m.clone().local().valueOf(), m.valueOf(),
                    `utcOffset(${z}:00) to local failed to keep utc time (implicit)`);
        }
    });
});
