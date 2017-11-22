describe("datetime", "timezone", "default", () => {
    const { datetime } = adone;

    specify("defaultZone", () => {
        assert.equal(
            datetime.defaultZone,
            null,
            "initial default zone should be null"
        );
        assert.equal(
            datetime.tz.setDefault("America/New_York").defaultZone.name,
            "America/New_York",
            "calling moment.tz.setDefault with a valid timezone should expose it via defaultZone"
        );
        assert.equal(
            datetime.tz.setDefault().defaultZone,
            null,
            "calling moment.tz.setDefault with a falsey argument should unset defaultZone"
        );
    });

    specify("normal", () => {
        datetime.tz.setDefault("America/New_York");
        const m = datetime();
        assert.equal(
            m._z.name,
            "America/New_York",
            "creating moments should set their default timezone if it is set"
        );

        datetime.tz.setDefault();
        const m2 = datetime();
        datetime.tz.setDefault("America/New_York");
        m2.millisecond(0);
        assert.equal(
            m2._z,
            null,
            "calling updateOffset on moments created before setting a default timezone should not affect their timezone"
        );
        datetime.tz.setDefault();
    });

    specify("utc", () => {
        datetime.tz.setDefault("America/New_York");
        assert.equal(
            datetime.utc().format("ZZ"),
            "+0000",
            "creating moments in UTC mode should ignore default timezone"
        );
        assert.notEqual(
            datetime().format("ZZ"),
            "+0000",
            "using UTC mode should not affect normal moment creation"
        );

        const utcDatetime = datetime.utc();
        const normalDatetime = datetime();
        const normalDatetimeOffset = normalDatetime.format("ZZ");
        datetime.tz.setDefault();
        utcDatetime.millisecond(0);
        normalDatetime.millisecond(0);
        assert.equal(
            utcDatetime.format("ZZ"),
            "+0000",
            "resetting default timezone should not affect existing moments created in UTC mode"
        );
        assert.equal(
            normalDatetime.format("ZZ"),
            normalDatetimeOffset,
            "resetting default timezone should not affect existing moments"
        );
    });
});
