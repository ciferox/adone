describe("datetime", "preparse and postformat", () => {
    before(() => {
        adone.datetime.locale("symbol", {
            preparse(string) {
                return string.replace(/[!@#$%\^&*()]/g, (match) => {
                    return numberMap[match];
                });
            },

            postformat(string) {
                return string.replace(/\d/g, (match) => {
                    return symbolMap[match];
                });
            }
        });

        // adone.datetime.locale("en");
    });

    after(() => {
        adone.datetime.defineLocale("symbol", null);
    });

    const symbolMap = {
        1: "!",
        2: "@",
        3: "#",
        4: "$",
        5: "%",
        6: "^",
        7: "&",
        8: "*",
        9: "(",
        0: ")"
    };

    const numberMap = {
        "!": "1",
        "@": "2",
        "#": "3",
        $: "4",
        "%": "5",
        "^": "6",
        "&": "7",
        "*": "8",
        "(": "9",
        ")": "0"
    };

    it("transform", () => {
        assert.equal(adone.datetime.utc("@)!@-)*-@&", "YYYY-MM-DD").unix(), 1346025600, "preparse string + format");
        assert.equal(adone.datetime.utc("@)!@-)*-@&").unix(), 1346025600, "preparse ISO8601 string");
        assert.equal(adone.datetime.unix(1346025600).utc().format("YYYY-MM-DD"), "@)!@-)*-@&", "postformat");
    });

    it("transform from", () => {
        const start = adone.datetime([2007, 1, 28]);

        assert.equal(start.from(adone.datetime([2007, 1, 28]).add({ s: 90 }), true), "@ minutes", "postformat should work on adone.datetime.fn.from");
        assert.equal(adone.datetime().add(6, "d").fromNow(true), "^ days", "postformat should work on adone.datetime.fn.fromNow");
        assert.equal(adone.datetime.duration(10, "h").humanize(), "!) hours", "postformat should work on adone.datetime.duration.fn.humanize");
    });

    it("calendar day", () => {
        const a = adone.datetime().hours(12).minutes(0).seconds(0);

        assert.equal(adone.datetime(a).calendar(), "Today at !@:)) PM", "today at the same time");
        assert.equal(adone.datetime(a).add({ m: 25 }).calendar(), "Today at !@:@% PM", "Now plus 25 min");
        assert.equal(adone.datetime(a).add({ h: 1 }).calendar(), "Today at !:)) PM", "Now plus 1 hour");
        assert.equal(adone.datetime(a).add({ d: 1 }).calendar(), "Tomorrow at !@:)) PM", "tomorrow at the same time");
        assert.equal(adone.datetime(a).subtract({ h: 1 }).calendar(), "Today at !!:)) AM", "Now minus 1 hour");
        assert.equal(adone.datetime(a).subtract({ d: 1 }).calendar(), "Yesterday at !@:)) PM", "yesterday at the same time");
    });
});
