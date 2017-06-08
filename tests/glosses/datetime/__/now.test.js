describe("datetime", "now", () => {
    before(() => {
        adone.datetime.locale("en");
    });

    it("now", () => {
        const startOfTest = new Date().valueOf();
        const momentNowTime = adone.datetime.now();
        const afterMomentCreationTime = new Date().valueOf();

        assert.ok(startOfTest <= momentNowTime, "adone.datetime now() time should be now, not in the past");
        assert.ok(momentNowTime <= afterMomentCreationTime, "adone.datetime now() time should be now, not in the future");
    });

    it("now - Date mocked", () => {
        // We need to test mocking the global Date object, so disable 'Read Only' jshint check
        /* jshint -W020 */
        const RealDate = Date;
        const customTimeMs = adone.datetime("2015-01-01T01:30:00.000Z").valueOf();

        function MockDate() {
            return new RealDate(customTimeMs);
        }

        MockDate.now = function () {
            return new MockDate().valueOf();
        };

        MockDate.prototype = RealDate.prototype;

        global.Date = MockDate;

        try {
            assert.equal(adone.datetime().valueOf(), customTimeMs, "adone.datetime now() time should use the global Date object");
        } finally {
            global.Date = RealDate;
        }
    });

    it("now - custom value", () => {
        const customTimeStr = "2015-01-01T01:30:00.000Z";
        const customTime = adone.datetime(customTimeStr, adone.datetime.ISO_8601).valueOf();
        const oldFn = adone.datetime.now;

        adone.datetime.now = function () {
            return customTime;
        };

        try {
            assert.equal(adone.datetime().toISOString(), customTimeStr, "adone.datetime() constructor should use the function defined by adone.datetime.now, but it did not");
            assert.equal(adone.datetime.utc().toISOString(), customTimeStr, "adone.datetime() constructor should use the function defined by adone.datetime.now, but it did not");
        } finally {
            adone.datetime.now = oldFn;
        }
    });

    it("empty object, empty array", () => {
        function assertIsNow(gen, msg) {
            const before = Number(new Date());
            const mid = gen();
            const after = Number(new Date());
            assert.ok(before <= Number(mid) && Number(mid) <= after, `should be now : ${msg}`);
        }
        assertIsNow(() => {
            return adone.datetime();
        }, "adone.datetime()");
        assertIsNow(() => {
            return adone.datetime([]);
        }, "adone.datetime([])");
        assertIsNow(() => {
            return adone.datetime({});
        }, "adone.datetime({})");
        assertIsNow(() => {
            return adone.datetime.utc();
        }, "adone.datetime.utc()");
        assertIsNow(() => {
            return adone.datetime.utc([]);
        }, "adone.datetime.utc([])");
        assertIsNow(() => {
            return adone.datetime.utc({});
        }, "adone.datetime.utc({})");
    });
});
