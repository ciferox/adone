describe("datetime", "timezone", "needs offset", () => {
    const { datetime } = adone;
    const { needsOffset } = datetime.tz;

    specify("Array", () => {
        assert.ok(needsOffset(datetime([2010, 0, 1])), "Parsing an array needs an offset.");
        assert.ok(needsOffset(datetime.utc([2010, 0, 1])), "Parsing an array needs an offset.");
    });

    specify("Now", () => {
        assert.ok(!needsOffset(datetime()), "Parsing now does not need an offset.");
        assert.ok(!needsOffset(datetime.utc()), "Parsing now does not need an offset.");
    });

    specify("String + Format", () => {
        assert.ok(needsOffset(datetime("Mar 4 2010", "MMM D YYYY")), "Parsing a string and format needs an offset.");
        assert.ok(needsOffset(datetime.utc("Mar 4 2010", "MMM D YYYY")), "Parsing a string and format needs an offset.");
    });

    specify("String + Timestamp Format", () => {
        assert.ok(!needsOffset(datetime.utc("1267660800000", "x")), 'Parsing a string with timestamp format "x" does not need an offset.');
        assert.ok(!needsOffset(datetime.utc("1267660800", "X")), 'Parsing a string with timestamp format "X" does not need an offset.');
    });

    specify("String + Format + Offset", () => {
        assert.ok(!needsOffset(datetime("Mar 4 2010 +1000", "MMM D YYYY Z")), "Parsing a string and format and offset does not need an offset.");
        assert.ok(!needsOffset(datetime.utc("Mar 4 2010 +1000", "MMM D YYYY Z")), "Parsing a string and format and offset does not need an offset.");
        assert.ok(!needsOffset(datetime("Mar 4 2010 +10:00", "MMM D YYYY ZZ")), "Parsing a string and format and offset does not need an offset.");
        assert.ok(!needsOffset(datetime.utc("Mar 4 2010 +10:00", "MMM D YYYY ZZ")), "Parsing a string and format and offset does not need an offset.");
    });

    specify("String + Formats", () => {
        const formats = ["YYYY-MM-DD", "MMM D YYYY"];
        assert.ok(needsOffset(datetime("Mar 4 2010", formats)), "Parsing a string and formats needs an offset.");
        assert.ok(needsOffset(datetime.utc("Mar 4 2010", formats)), "Parsing a string and formats needs an offset.");
    });

    specify("String + Timestamp Formats", () => {
        const formats = ["x", "X", "MMM D YYYY"];
        assert.ok(!needsOffset(datetime.utc("1267660800000", formats)), 'Parsing a string with timestamp format "x" does not need an offset.');
        assert.ok(!needsOffset(datetime.utc("1267660800", formats)), 'Parsing a string with timestamp format "X" does not need an offset.');
        assert.ok(needsOffset(datetime("Mar 4 2010", formats)), "Parsing a string and formats needs an offset.");
    });

    specify("ISO 8601 String", () => {
        assert.ok(needsOffset(datetime("2011-10-10 10:10:10")), "Parsing an ISO 8601 string without an offset needs an offset.");
        assert.ok(needsOffset(datetime.utc("2011-10-10 10:10:10")), "Parsing an ISO 8601 string without an offset needs an offset.");
        assert.ok(!needsOffset(datetime("2011-10-10 10:10:10+10:00")), "Parsing an ISO 8601 string with an offset does not need an offset.");
        assert.ok(!needsOffset(datetime.utc("2011-10-10 10:10:10+10:00")), "Parsing an ISO 8601 string with an offset does not need an offset.");
        assert.ok(!needsOffset(datetime("2011-10-10 10:10:10+00:00")), "Parsing an ISO 8601 string with an offset does not need an offset.");
        assert.ok(!needsOffset(datetime.utc("2011-10-10 10:10:10+00:00")), "Parsing an ISO 8601 string with an offset does not need an offset.");
    });

    specify("Object", () => {
        assert.ok(needsOffset(datetime({ y: 2010, M: 3, d: 1 })), "Parsing an object needs an offset.");
        assert.ok(needsOffset(datetime({ year: 2010, month: 3, day: 1 })), "Parsing an object needs an offset.");
        assert.ok(needsOffset(datetime.utc({ y: 2010, M: 3, d: 1 })), "Parsing an object needs an offset.");
    });

    specify("Unix Offset", () => {
        assert.ok(!needsOffset(datetime(1318781876406)), "Parsing unix timestamp in milliseconds does not need an offset.");
        assert.ok(!needsOffset(datetime.utc(1318781876406)), "Parsing unix timestamp in milliseconds does not need an offset.");
    });

    specify("Unix Timestamp", () => {
        assert.ok(!needsOffset(datetime.unix(1318781876)), "Parsing unix timestamp in seconds does not need an offset.");
    });

    specify("Date", () => {
        assert.ok(!needsOffset(datetime(new Date())), "Parsing a date object does not need an offset.");
        assert.ok(!needsOffset(datetime.utc(new Date())), "Parsing a date object does not need an offset.");
    });
});
