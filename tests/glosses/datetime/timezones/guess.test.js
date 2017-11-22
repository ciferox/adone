describe("datetime", "timezone", "guess", () => {

    const { datetime: { tz } } = adone;

    const getTimezoneOffset = Date.prototype.getTimezoneOffset;
    const toTimeString = Date.prototype.toTimeString;
    const parent = global;
    const oldIntl = parent.Intl;

    const mockTimezoneOffset = (zone, format) => {
        Date.prototype.getTimezoneOffset = function () {
            return zone.utcOffset(Number(this));
        };
        Date.prototype.toTimeString = function () {
            return tz(Number(this), zone.name).format(format || "HH:mm:ss [GMT]ZZ");
        };
    };

    const mockIntlTimeZone = (name) => {
        parent.Intl = {
            DateTimeFormat() {
                return {
                    resolvedOptions() {
                        return {
                            timeZone: name
                        };
                    }
                };
            }
        };
    };

    before(() => {
        parent.Intl = undefined;
    });

    after(() => {
        Date.prototype.getTimezoneOffset = getTimezoneOffset;
        Date.prototype.toTimeString = toTimeString;
        parent.Intl = oldIntl;
    });

    specify("different offsets should guess different timezones", () => {
        mockTimezoneOffset(tz.zone("Europe/London"));
        const london = tz.guess(true);
        mockTimezoneOffset(tz.zone("America/New_York"));
        const newYork = tz.guess(true);
        mockTimezoneOffset(tz.zone("America/Los_Angeles"));
        const losAngeles = tz.guess(true);

        assert.ok(london);
        assert.ok(newYork);
        assert.ok(losAngeles);
        assert.notEqual(london, newYork);
        assert.notEqual(london, losAngeles);
    });

    specify("handles uncommon Date#toTimeString formats", () => {
        assert.doesNotThrow(() => {
            mockTimezoneOffset(tz.zone("Europe/London"), "HH:mm:ss (123)");
            tz.guess(true);
        });
        assert.doesNotThrow(() => {
            mockTimezoneOffset(tz.zone("Europe/London"), "HH:mm:ss");
            tz.guess(true);
        });
        assert.doesNotThrow(() => {
            mockTimezoneOffset(tz.zone("Europe/London"), "HH:mm:ss (台北標準時間)");
            tz.guess(true);
        });
    });

    specify("When Intl is available, it is used", () => {
        mockIntlTimeZone("Europe/London");
        assert.equal(tz.guess(true), "Europe/London");

        mockIntlTimeZone("America/New_York");
        assert.equal(tz.guess(true), "America/New_York");

        mockIntlTimeZone("America/Some_Missing_Zone");
        mockTimezoneOffset(tz.zone("America/Los_Angeles"));
        assert.equal(tz.guess(true), "America/Los_Angeles");
    });

    specify("When Intl is available, but timeZone is undefined, should return a guess without logging an error", () => {
        const oldError = console.error;
        let errors = "";
        console.error = function (message) {
            errors += message;
        };

        mockIntlTimeZone(undefined);
        mockTimezoneOffset(tz.zone("Europe/London"));
        assert.equal(tz.guess(true), "Europe/London");
        assert.equal(errors, "");

        console.error = oldError;
    });

    specify("ensure each zone is represented", () => {
        const names = tz.names();
        let zone;
        let i;

        for (i = 0; i < names.length; i++) {
            zone = tz.zone(names[i]);
            mockTimezoneOffset(zone);
            assert.ok(tz.guess(true), `Should have a guess for ${zone.name})`);
        }
    });
});
