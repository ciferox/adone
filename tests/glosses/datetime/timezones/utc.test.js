import * as helpers from "./helpers";

describe("datetime", "timezone", "utc", () => {
    const { datetime } = adone;

    before(() => {
        datetime.tz.reload();
    });

    specify("utc", () => {
        datetime.tz.add([
            "TestUTC/Pacific|PST|80|0|",
            "TestUTC/Eastern|EST|50|0|"
        ]);

        let m = datetime("2014-07-10 12:00:00+00:00");
        const localFormat = m.format();
        const localOffset = helpers.getUTCOffset(m);

        m.tz("TestUTC/Pacific");

        assert.equal(helpers.getUTCOffset(m), -480, "Should change the offset when using moment.fn.tz");
        assert.equal(m.format(), "2014-07-10T04:00:00-08:00", "Should change the offset when using moment.fn.tz");

        m.utc();
        datetime.updateOffset(m);

        assert.equal(helpers.getUTCOffset(m), 0, "Should set the offset to +00:00 when using moment.fn.utc");
        assert.equal(m.format(), "2014-07-10T12:00:00Z", "Should change the offset when using moment.fn.utc");

        m.tz("TestUTC/Eastern");

        assert.equal(helpers.getUTCOffset(m), -300, "Should change the offset when using moment.fn.tz");
        assert.equal(m.format(), "2014-07-10T07:00:00-05:00", "Should change the offset when using moment.fn.tz");

        m.utc();
        datetime.updateOffset(m);

        assert.equal(helpers.getUTCOffset(m), 0, "Should set the offset to +00:00 when using moment.fn.utc");
        assert.equal(m.format(), "2014-07-10T12:00:00Z", "Should change the offset when using moment.fn.utc");

        m.local();
        datetime.updateOffset(m);

        assert.equal(helpers.getUTCOffset(m), localOffset, "Should reset the offset to local time when using moment.fn.local");
        assert.equal(m.format(), localFormat, "Should reset the offset to local time when using moment.fn.local");

        m = datetime("2017-01-01T00:00:00");
        const utcWallTimeFormat = m.clone().utcOffset("-05:00", true).format();
        m.tz("America/New_York", true);
        assert.equal(m.format(), utcWallTimeFormat, "Should change the offset while keeping wall time when passing an optional parameter to moment.fn.tz");
    });
});
