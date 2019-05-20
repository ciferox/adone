const {
    pretty
} = adone;

describe("pretty", "time", () => {
    it("main", () => {
        assert.match(pretty.time(), /^[\d-]+ [\d:]+$/);
        assert.match(pretty.time({ date: new Date() }), /^[\d-]+ [\d:]+$/);
    });

    it("showTimeZone option", () => {
        assert.match(pretty.time({ showTimeZone: true }), /^[\d-]+ [\d:]+ UTC[-+][\d:]+$/);

        assert.match(pretty.time({
            local: false,
            showTimeZone: true
        }), /^[\d-]+ [\d:]+ UTC$/);
    });

    it("showMilliseconds option", () => {
        assert.match(pretty.time({
            local: false,
            showMilliseconds: true
        }), /^[\d-]+ [\d:]+ \d+ms$/);

        assert.match(pretty.time({
            local: false,
            showMilliseconds: true,
            showTimeZone: true
        }), /^[\d-]+ [\d:]+ \d+ms UTC$/);
    });

    describe("time zone", () => {
        it("default", () => {
            assert.match(pretty.timeZone(), /^[+-][\d:]+$/);
        });

    });
});
