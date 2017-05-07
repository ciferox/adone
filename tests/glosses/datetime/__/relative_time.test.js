describe("relative time", () => {
    before(() => {
        adone.datetime.locale("en");
    });

    it("default thresholds fromNow", () => {
        let a = adone.datetime();

        // Seconds to minutes threshold
        a.subtract(44, "seconds");
        assert.equal(a.fromNow(), "a few seconds ago", "Below default seconds to minutes threshold");
        a.subtract(1, "seconds");
        assert.equal(a.fromNow(), "a minute ago", "Above default seconds to minutes threshold");

        // Minutes to hours threshold
        a = adone.datetime();
        a.subtract(44, "minutes");
        assert.equal(a.fromNow(), "44 minutes ago", "Below default minute to hour threshold");
        a.subtract(1, "minutes");
        assert.equal(a.fromNow(), "an hour ago", "Above default minute to hour threshold");

        // Hours to days threshold
        a = adone.datetime();
        a.subtract(21, "hours");
        assert.equal(a.fromNow(), "21 hours ago", "Below default hours to day threshold");
        a.subtract(1, "hours");
        assert.equal(a.fromNow(), "a day ago", "Above default hours to day threshold");

        // Days to month threshold
        a = adone.datetime();
        a.subtract(25, "days");
        assert.equal(a.fromNow(), "25 days ago", "Below default days to month (singular) threshold");
        a.subtract(1, "days");
        assert.equal(a.fromNow(), "a month ago", "Above default days to month (singular) threshold");

        // months to year threshold
        a = adone.datetime();
        a.subtract(10, "months");
        assert.equal(a.fromNow(), "10 months ago", "Below default days to years threshold");
        a.subtract(1, "month");
        assert.equal(a.fromNow(), "a year ago", "Above default days to years threshold");
    });

    it("default thresholds toNow", () => {
        let a = adone.datetime();

        // Seconds to minutes threshold
        a.subtract(44, "seconds");
        assert.equal(a.toNow(), "in a few seconds", "Below default seconds to minutes threshold");
        a.subtract(1, "seconds");
        assert.equal(a.toNow(), "in a minute", "Above default seconds to minutes threshold");

        // Minutes to hours threshold
        a = adone.datetime();
        a.subtract(44, "minutes");
        assert.equal(a.toNow(), "in 44 minutes", "Below default minute to hour threshold");
        a.subtract(1, "minutes");
        assert.equal(a.toNow(), "in an hour", "Above default minute to hour threshold");

        // Hours to days threshold
        a = adone.datetime();
        a.subtract(21, "hours");
        assert.equal(a.toNow(), "in 21 hours", "Below default hours to day threshold");
        a.subtract(1, "hours");
        assert.equal(a.toNow(), "in a day", "Above default hours to day threshold");

        // Days to month threshold
        a = adone.datetime();
        a.subtract(25, "days");
        assert.equal(a.toNow(), "in 25 days", "Below default days to month (singular) threshold");
        a.subtract(1, "days");
        assert.equal(a.toNow(), "in a month", "Above default days to month (singular) threshold");

        // months to year threshold
        a = adone.datetime();
        a.subtract(10, "months");
        assert.equal(a.toNow(), "in 10 months", "Below default days to years threshold");
        a.subtract(1, "month");
        assert.equal(a.toNow(), "in a year", "Above default days to years threshold");
    });

    it("custom thresholds", () => {
        let a;

        // Seconds to minute threshold, under 30
        adone.datetime.relativeTimeThreshold("s", 25);

        a = adone.datetime();
        a.subtract(24, "seconds");
        assert.equal(a.fromNow(), "a few seconds ago", "Below custom seconds to minute threshold, s < 30");
        a.subtract(1, "seconds");
        assert.equal(a.fromNow(), "a minute ago", "Above custom seconds to minute threshold, s < 30");

        // Seconds to minutes threshold
        adone.datetime.relativeTimeThreshold("s", 55);

        a = adone.datetime();
        a.subtract(54, "seconds");
        assert.equal(a.fromNow(), "a few seconds ago", "Below custom seconds to minutes threshold");
        a.subtract(1, "seconds");
        assert.equal(a.fromNow(), "a minute ago", "Above custom seconds to minutes threshold");

        adone.datetime.relativeTimeThreshold("s", 45);

        // A few seconds to seconds threshold
        adone.datetime.relativeTimeThreshold("ss", 3);

        a = adone.datetime();
        a.subtract(3, "seconds");
        assert.equal(a.fromNow(), "a few seconds ago", "Below custom a few seconds to seconds threshold");
        a.subtract(1, "seconds");
        assert.equal(a.fromNow(), "4 seconds ago", "Above custom a few seconds to seconds threshold");

        adone.datetime.relativeTimeThreshold("ss", 44);

        // Minutes to hours threshold
        adone.datetime.relativeTimeThreshold("m", 55);
        a = adone.datetime();
        a.subtract(54, "minutes");
        assert.equal(a.fromNow(), "54 minutes ago", "Below custom minutes to hours threshold");
        a.subtract(1, "minutes");
        assert.equal(a.fromNow(), "an hour ago", "Above custom minutes to hours threshold");
        adone.datetime.relativeTimeThreshold("m", 45);

        // Hours to days threshold
        adone.datetime.relativeTimeThreshold("h", 24);
        a = adone.datetime();
        a.subtract(23, "hours");
        assert.equal(a.fromNow(), "23 hours ago", "Below custom hours to days threshold");
        a.subtract(1, "hours");
        assert.equal(a.fromNow(), "a day ago", "Above custom hours to days threshold");
        adone.datetime.relativeTimeThreshold("h", 22);

        // Days to month threshold
        adone.datetime.relativeTimeThreshold("d", 28);
        a = adone.datetime();
        a.subtract(27, "days");
        assert.equal(a.fromNow(), "27 days ago", "Below custom days to month (singular) threshold");
        a.subtract(1, "days");
        assert.equal(a.fromNow(), "a month ago", "Above custom days to month (singular) threshold");
        adone.datetime.relativeTimeThreshold("d", 26);

        // months to years threshold
        adone.datetime.relativeTimeThreshold("M", 9);
        a = adone.datetime();
        a.subtract(8, "months");
        assert.equal(a.fromNow(), "8 months ago", "Below custom days to years threshold");
        a.subtract(1, "months");
        assert.equal(a.fromNow(), "a year ago", "Above custom days to years threshold");
        adone.datetime.relativeTimeThreshold("M", 11);
    });

    it("custom rounding", () => {
        const roundingDefault = adone.datetime.relativeTimeRounding();
        const sThreshold = adone.datetime.relativeTimeThreshold("s");
        const mThreshold = adone.datetime.relativeTimeThreshold("m");
        const hThreshold = adone.datetime.relativeTimeThreshold("h");
        const dThreshold = adone.datetime.relativeTimeThreshold("d");
        const MThreshold = adone.datetime.relativeTimeThreshold("M");
        // Round relative time evaluation down
        try {
            adone.datetime.relativeTimeRounding(Math.floor);

            adone.datetime.relativeTimeThreshold("s", 60);
            adone.datetime.relativeTimeThreshold("m", 60);
            adone.datetime.relativeTimeThreshold("h", 24);
            adone.datetime.relativeTimeThreshold("d", 27);
            adone.datetime.relativeTimeThreshold("M", 12);

            let a = adone.datetime.utc();
            a.subtract({ minutes: 59, seconds: 59 });
            assert.equal(a.toNow(), "in 59 minutes", "Round down towards the nearest minute");

            a = adone.datetime.utc();
            a.subtract({ hours: 23, minutes: 59, seconds: 59 });
            assert.equal(a.toNow(), "in 23 hours", "Round down towards the nearest hour");

            a = adone.datetime.utc();
            a.subtract({ days: 26, hours: 23, minutes: 59 });
            assert.equal(a.toNow(), "in 26 days", "Round down towards the nearest day (just under)");

            a = adone.datetime.utc();
            a.subtract({ days: 27 });
            assert.equal(a.toNow(), "in a month", "Round down towards the nearest day (just over)");

            a = adone.datetime.utc();
            a.subtract({ days: 364 });
            assert.equal(a.toNow(), "in 11 months", "Round down towards the nearest month");

            a = adone.datetime.utc();
            a.subtract({ years: 1, days: 364 });
            assert.equal(a.toNow(), "in a year", "Round down towards the nearest year");

            // Do not round relative time evaluation
            const retainValue = function (value) {
                return value.toFixed(3);
            };
            adone.datetime.relativeTimeRounding(retainValue);

            a = adone.datetime.utc();
            a.subtract({ hours: 39 });
            assert.equal(a.toNow(), "in 1.625 days", "Round down towards the nearest year");
        } finally {
            adone.datetime.relativeTimeRounding(roundingDefault);
            adone.datetime.relativeTimeThreshold("s", sThreshold);
            adone.datetime.relativeTimeThreshold("m", mThreshold);
            adone.datetime.relativeTimeThreshold("h", hThreshold);
            adone.datetime.relativeTimeThreshold("d", dThreshold);
            adone.datetime.relativeTimeThreshold("M", MThreshold);
        }
    });

    it("retrieve rounding settings", () => {
        adone.datetime.relativeTimeRounding(Math.round);
        const roundingFunction = adone.datetime.relativeTimeRounding();

        assert.equal(roundingFunction, Math.round, "Can retrieve rounding setting");
    });

    it("retrieve threshold settings", () => {
        adone.datetime.relativeTimeThreshold("m", 45);
        const minuteThreshold = adone.datetime.relativeTimeThreshold("m");

        assert.equal(minuteThreshold, 45, "Can retrieve minute setting");
    });
});
