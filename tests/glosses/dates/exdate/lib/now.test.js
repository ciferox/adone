describe("now", () => {
    before(() => {
        adone.date.locale("en");
    });

    it("now", () => {
        const startOfTest = new Date().valueOf();
        const momentNowTime = adone.date.now();
        const afterMomentCreationTime = new Date().valueOf();

        assert.ok(startOfTest <= momentNowTime, "adone.date now() time should be now, not in the past");
        assert.ok(momentNowTime <= afterMomentCreationTime, "adone.date now() time should be now, not in the future");
    });

    it("now - Date mocked", () => {
        // We need to test mocking the global Date object, so disable 'Read Only' jshint check
        /* jshint -W020 */
        const RealDate = Date;
        const customTimeMs = adone.date("2015-01-01T01:30:00.000Z").valueOf();

        function MockDate() {
            return new RealDate(customTimeMs);
        }

        MockDate.now = function () {
            return new MockDate().valueOf();
        };

        MockDate.prototype = RealDate.prototype;

        global.Date = MockDate;

        try {
            assert.equal(adone.date().valueOf(), customTimeMs, "adone.date now() time should use the global Date object");
        } finally {
            global.Date = RealDate;
        }
    });

    it("now - custom value", () => {
        const customTimeStr = "2015-01-01T01:30:00.000Z";
        const customTime = adone.date(customTimeStr, adone.date.ISO_8601).valueOf();
        const oldFn = adone.date.now;

        adone.date.now = function () {
            return customTime;
        };

        try {
            assert.equal(adone.date().toISOString(), customTimeStr, "adone.date() constructor should use the function defined by adone.date.now, but it did not");
            assert.equal(adone.date.utc().toISOString(), customTimeStr, "adone.date() constructor should use the function defined by adone.date.now, but it did not");
        } finally {
            adone.date.now = oldFn;
        }
    });

    it("empty object, empty array", () => {
        function assertIsNow(gen, msg) {
            const before = +(new Date());
            const mid = gen();
            const after = +(new Date());
            assert.ok(before <= +mid && +mid <= after, "should be now : " + msg);
        }
        assertIsNow(function () {
            return adone.date();
        }, "adone.date()");
        assertIsNow(function () {
            return adone.date([]);
        }, "adone.date([])");
        assertIsNow(function () {
            return adone.date({});
        }, "adone.date({})");
        assertIsNow(function () {
            return adone.date.utc();
        }, "adone.date.utc()");
        assertIsNow(function () {
            return adone.date.utc([]);
        }, "adone.date.utc([])");
        assertIsNow(function () {
            return adone.date.utc({});
        }, "adone.date.utc({})");
    });
});
