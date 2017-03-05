describe("preparse and postformat", () => {
    before(() => {
        adone.date.locale("symbol", {
            preparse (string) {
                return string.replace(/[!@#$%\^&*()]/g, function (match) {
                    return numberMap[match];
                });
            },

            postformat (string) {
                return string.replace(/\d/g, function (match) {
                    return symbolMap[match];
                });
            }
        });

        // adone.date.locale("en");
    });

    after(() => {
        adone.date.defineLocale("symbol", null);
    });

    const symbolMap = {
        "1": "!",
        "2": "@",
        "3": "#",
        "4": "$",
        "5": "%",
        "6": "^",
        "7": "&",
        "8": "*",
        "9": "(",
        "0": ")"
    };

    const numberMap = {
        "!": "1",
        "@": "2",
        "#": "3",
        "$": "4",
        "%": "5",
        "^": "6",
        "&": "7",
        "*": "8",
        "(": "9",
        ")": "0"
    };

    it("transform", () => {
        assert.equal(adone.date.utc("@)!@-)*-@&", "YYYY-MM-DD").unix(), 1346025600, "preparse string + format");
        assert.equal(adone.date.utc("@)!@-)*-@&").unix(), 1346025600, "preparse ISO8601 string");
        assert.equal(adone.date.unix(1346025600).utc().format("YYYY-MM-DD"), "@)!@-)*-@&", "postformat");
    });

    it("transform from", () => {
        const start = adone.date([2007, 1, 28]);

        assert.equal(start.from(adone.date([2007, 1, 28]).add({s: 90}), true), "@ minutes", "postformat should work on adone.date.fn.from");
        assert.equal(adone.date().add(6, "d").fromNow(true), "^ days", "postformat should work on adone.date.fn.fromNow");
        assert.equal(adone.date.duration(10, "h").humanize(), "!) hours", "postformat should work on adone.date.duration.fn.humanize");
    });

    it("calendar day", () => {
        const a = adone.date().hours(12).minutes(0).seconds(0);

        assert.equal(adone.date(a).calendar(),                   "Today at !@:)) PM",     "today at the same time");
        assert.equal(adone.date(a).add({m: 25}).calendar(),      "Today at !@:@% PM",     "Now plus 25 min");
        assert.equal(adone.date(a).add({h: 1}).calendar(),       "Today at !:)) PM",      "Now plus 1 hour");
        assert.equal(adone.date(a).add({d: 1}).calendar(),       "Tomorrow at !@:)) PM",  "tomorrow at the same time");
        assert.equal(adone.date(a).subtract({h: 1}).calendar(),  "Today at !!:)) AM",     "Now minus 1 hour");
        assert.equal(adone.date(a).subtract({d: 1}).calendar(),  "Yesterday at !@:)) PM", "yesterday at the same time");
    });
});
