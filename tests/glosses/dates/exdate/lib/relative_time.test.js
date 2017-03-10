describe("relative time", () => {
    before(() => {
        adone.date.locale("en");
    });

    it("default thresholds fromNow", () => {
        let a = adone.date();

        // Seconds to minutes threshold
        a.subtract(44, "seconds");
        assert.equal(a.fromNow(), "a few seconds ago", "Below default seconds to minutes threshold");
        a.subtract(1, "seconds");
        assert.equal(a.fromNow(), "a minute ago", "Above default seconds to minutes threshold");

        // Minutes to hours threshold
        a = adone.date();
        a.subtract(44, "minutes");
        assert.equal(a.fromNow(), "44 minutes ago", "Below default minute to hour threshold");
        a.subtract(1, "minutes");
        assert.equal(a.fromNow(), "an hour ago", "Above default minute to hour threshold");

        // Hours to days threshold
        a = adone.date();
        a.subtract(21, "hours");
        assert.equal(a.fromNow(), "21 hours ago", "Below default hours to day threshold");
        a.subtract(1, "hours");
        assert.equal(a.fromNow(), "a day ago", "Above default hours to day threshold");

        // Days to month threshold
        a = adone.date();
        a.subtract(25, "days");
        assert.equal(a.fromNow(), "25 days ago", "Below default days to month (singular) threshold");
        a.subtract(1, "days");
        assert.equal(a.fromNow(), "a month ago", "Above default days to month (singular) threshold");

        // months to year threshold
        a = adone.date();
        a.subtract(10, "months");
        assert.equal(a.fromNow(), "10 months ago", "Below default days to years threshold");
        a.subtract(1, "month");
        assert.equal(a.fromNow(), "a year ago", "Above default days to years threshold");
    });

    it("default thresholds toNow", () => {
        let a = adone.date();

        // Seconds to minutes threshold
        a.subtract(44, "seconds");
        assert.equal(a.toNow(), "in a few seconds", "Below default seconds to minutes threshold");
        a.subtract(1, "seconds");
        assert.equal(a.toNow(), "in a minute", "Above default seconds to minutes threshold");

        // Minutes to hours threshold
        a = adone.date();
        a.subtract(44, "minutes");
        assert.equal(a.toNow(), "in 44 minutes", "Below default minute to hour threshold");
        a.subtract(1, "minutes");
        assert.equal(a.toNow(), "in an hour", "Above default minute to hour threshold");

        // Hours to days threshold
        a = adone.date();
        a.subtract(21, "hours");
        assert.equal(a.toNow(), "in 21 hours", "Below default hours to day threshold");
        a.subtract(1, "hours");
        assert.equal(a.toNow(), "in a day", "Above default hours to day threshold");

        // Days to month threshold
        a = adone.date();
        a.subtract(25, "days");
        assert.equal(a.toNow(), "in 25 days", "Below default days to month (singular) threshold");
        a.subtract(1, "days");
        assert.equal(a.toNow(), "in a month", "Above default days to month (singular) threshold");

        // months to year threshold
        a = adone.date();
        a.subtract(10, "months");
        assert.equal(a.toNow(), "in 10 months", "Below default days to years threshold");
        a.subtract(1, "month");
        assert.equal(a.toNow(), "in a year", "Above default days to years threshold");
    });

    it("custom thresholds", () => {
        let a;

        // Seconds to minute threshold, under 30
        adone.date.relativeTimeThreshold("s", 25);

        a = adone.date();
        a.subtract(24, "seconds");
        assert.equal(a.fromNow(), "a few seconds ago", "Below custom seconds to minute threshold, s < 30");
        a.subtract(1, "seconds");
        assert.equal(a.fromNow(), "a minute ago", "Above custom seconds to minute threshold, s < 30");

        // Seconds to minutes threshold
        adone.date.relativeTimeThreshold("s", 55);

        a = adone.date();
        a.subtract(54, "seconds");
        assert.equal(a.fromNow(), "a few seconds ago", "Below custom seconds to minutes threshold");
        a.subtract(1, "seconds");
        assert.equal(a.fromNow(), "a minute ago", "Above custom seconds to minutes threshold");

        adone.date.relativeTimeThreshold("s", 45);

        // Minutes to hours threshold
        adone.date.relativeTimeThreshold("m", 55);
        a = adone.date();
        a.subtract(54, "minutes");
        assert.equal(a.fromNow(), "54 minutes ago", "Below custom minutes to hours threshold");
        a.subtract(1, "minutes");
        assert.equal(a.fromNow(), "an hour ago", "Above custom minutes to hours threshold");
        adone.date.relativeTimeThreshold("m", 45);

        // Hours to days threshold
        adone.date.relativeTimeThreshold("h", 24);
        a = adone.date();
        a.subtract(23, "hours");
        assert.equal(a.fromNow(), "23 hours ago", "Below custom hours to days threshold");
        a.subtract(1, "hours");
        assert.equal(a.fromNow(), "a day ago", "Above custom hours to days threshold");
        adone.date.relativeTimeThreshold("h", 22);

        // Days to month threshold
        adone.date.relativeTimeThreshold("d", 28);
        a = adone.date();
        a.subtract(27, "days");
        assert.equal(a.fromNow(), "27 days ago", "Below custom days to month (singular) threshold");
        a.subtract(1, "days");
        assert.equal(a.fromNow(), "a month ago", "Above custom days to month (singular) threshold");
        adone.date.relativeTimeThreshold("d", 26);

        // months to years threshold
        adone.date.relativeTimeThreshold("M", 9);
        a = adone.date();
        a.subtract(8, "months");
        assert.equal(a.fromNow(), "8 months ago", "Below custom days to years threshold");
        a.subtract(1, "months");
        assert.equal(a.fromNow(), "a year ago", "Above custom days to years threshold");
        adone.date.relativeTimeThreshold("M", 11);
    });

    it("custom rounding", () => {
        const roundingDefault = adone.date.relativeTimeRounding();
        const sThreshold = adone.date.relativeTimeThreshold("s");
        const mThreshold = adone.date.relativeTimeThreshold("m");
        const hThreshold = adone.date.relativeTimeThreshold("h");
        const dThreshold = adone.date.relativeTimeThreshold("d");
        const MThreshold = adone.date.relativeTimeThreshold("M");
        // Round relative time evaluation down
        try {
            adone.date.relativeTimeRounding(Math.floor);

            adone.date.relativeTimeThreshold("s", 60);
            adone.date.relativeTimeThreshold("m", 60);
            adone.date.relativeTimeThreshold("h", 24);
            adone.date.relativeTimeThreshold("d", 31);
            adone.date.relativeTimeThreshold("M", 12);

            let a = adone.date.utc();
            a.subtract({ minutes: 59, seconds: 59 });
            assert.equal(a.toNow(), "in 59 minutes", "Round down towards the nearest minute");

            a = adone.date.utc();
            a.subtract({ hours: 23, minutes: 59, seconds: 59 });
            assert.equal(a.toNow(), "in 23 hours", "Round down towards the nearest hour");

            a = adone.date.utc();
            a.subtract({ days: 15, hours: 23, minutes: 59 });
            assert.equal(a.toNow(), "in 15 days", "Round down towards the nearest day");

            a = adone.date.utc();
            a.subtract({ days: 364 });
            assert.equal(a.toNow(), "in 11 months", "Round down towards the nearest month");

            a = adone.date.utc();
            a.subtract({ years: 1, days: 364 });
            assert.equal(a.toNow(), "in a year", "Round down towards the nearest year");

            // Do not round relative time evaluation
            const retainValue = function (value) {
                return value.toFixed(3);
            };
            adone.date.relativeTimeRounding(retainValue);

            a = adone.date.utc();
            a.subtract({ hours: 39 });
            assert.equal(a.toNow(), "in 1.625 days", "Round down towards the nearest year");
        } finally {
            adone.date.relativeTimeRounding(roundingDefault);
            adone.date.relativeTimeThreshold("s", sThreshold);
            adone.date.relativeTimeThreshold("m", mThreshold);
            adone.date.relativeTimeThreshold("h", hThreshold);
            adone.date.relativeTimeThreshold("d", dThreshold);
            adone.date.relativeTimeThreshold("M", MThreshold);
        }
    });

    it("retrive rounding settings", () => {
        adone.date.relativeTimeRounding(Math.round);
        const roundingFunction = adone.date.relativeTimeRounding();

        assert.equal(roundingFunction, Math.round, "Can retrieve rounding setting");
    });

    it("retrive threshold settings", () => {
        adone.date.relativeTimeThreshold("m", 45);
        const minuteThreshold = adone.date.relativeTimeThreshold("m");

        assert.equal(minuteThreshold, 45, "Can retrieve minute setting");
    });
});
