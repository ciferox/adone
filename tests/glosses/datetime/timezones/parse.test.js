import * as helpers from "./helpers";

describe("datetime", "timezone", "parse", () => {
    const { datetime } = adone;

    const LosAngeles = "America/Los_Angeles|PST PDT PWT PPT|80 70 70 70|010102301010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010|-261q0 1nX0 11B0 1nX0 SgN0 8x10 iy0 5Wp0 1Vb0 3dB0 WL0 1qN0 11z0 1o10 11z0 1o10 11z0 1o10 11z0 1o10 11z0 1qN0 11z0 1o10 11z0 1o10 11z0 1o10 11z0 1o10 11z0 1qN0 WL0 1qN0 1cL0 1cN0 1cL0 1cN0 1cL0 1cN0 1fz0 1a10 1fz0 1cN0 1cL0 1cN0 1cL0 1cN0 1cL0 1cN0 1cL0 1cN0 1fz0 1cN0 1cL0 1cN0 1cL0 s10 1Vz0 LB0 1BX0 1cN0 1fz0 1a10 1fz0 1cN0 1cL0 1cN0 1cL0 1cN0 1cL0 1cN0 1cL0 1cN0 1fz0 1a10 1fz0 1cN0 1cL0 1cN0 1cL0 1cN0 1cL0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0";
    const NewYork = "America/New_York|EST EDT EWT EPT|50 40 40 40|01010101010101010101010101010101010101010101010102301010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010|-261t0 1nX0 11B0 1nX0 11B0 1qL0 1a10 11z0 1qN0 WL0 1qN0 11z0 1o10 11z0 1o10 11z0 1o10 11z0 1o10 11z0 1qN0 11z0 1o10 11z0 1o10 11z0 1o10 11z0 1o10 11z0 1qN0 WL0 1qN0 11z0 1o10 11z0 1o10 11z0 1o10 11z0 1o10 11z0 1qN0 WL0 1qN0 11z0 1o10 11z0 RB0 8x40 iv0 1o10 11z0 1o10 11z0 1o10 11z0 1o10 11z0 1qN0 WL0 1qN0 11z0 1o10 11z0 1o10 11z0 1o10 11z0 1o10 1fz0 1cN0 1cL0 1cN0 1cL0 1cN0 1cL0 1cN0 1cL0 1cN0 1fz0 1cN0 1cL0 1cN0 1cL0 1cN0 1cL0 1cN0 1cL0 1cN0 1fz0 1a10 1fz0 1cN0 1cL0 1cN0 1cL0 1cN0 1cL0 1cN0 1cL0 1cN0 1fz0 1cN0 1cL0 1cN0 1cL0 s10 1Vz0 LB0 1BX0 1cN0 1fz0 1a10 1fz0 1cN0 1cL0 1cN0 1cL0 1cN0 1cL0 1cN0 1cL0 1cN0 1fz0 1a10 1fz0 1cN0 1cL0 1cN0 1cL0 1cN0 1cL0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0";

    let moveAmbiguousForward;
    let moveInvalidForward;

    beforeEach(() => {
        datetime.tz.add([LosAngeles, NewYork]);

        moveAmbiguousForward = datetime.tz.moveAmbiguousForward;
        moveInvalidForward = datetime.tz.moveInvalidForward;
    });

    afterEach(() => {
        datetime.tz.moveAmbiguousForward = moveAmbiguousForward;
        datetime.tz.moveInvalidForward = moveInvalidForward;
        datetime.tz.setDefault(null);
    });

    specify("default states", () => {
        assert.ok(datetime.tz.moveInvalidForward, "Should default to moving invalid input forward");
        assert.ok(!datetime.tz.moveAmbiguousForward, "Should default to moving ambiguous input backward");

    });

    specify("invalid input - moveInvalidForward = false - Los Angeles", () => {
        datetime.tz.moveInvalidForward = false;

        // the hour from 2am to 3am does not exist on March 11 2011 in America/Los_Angeles
        const before = datetime.tz([2012, 2, 11, 1, 59, 59], "America/Los_Angeles");
        const atStart = datetime.tz([2012, 2, 11, 2, 0, 0], "America/Los_Angeles");
        const atEnd = datetime.tz([2012, 2, 11, 2, 59, 59], "America/Los_Angeles");
        const after = datetime.tz([2012, 2, 11, 3, 0, 0], "America/Los_Angeles");

        assert.equal(before.format("HH mm ss Z"), "01 59 59 -08:00", "Before the lost hour, the time should match the input time");
        assert.equal(atStart.format("HH mm ss Z"), "01 00 00 -08:00", "During the lost hour, the time should roll back to the previous time");
        assert.equal(atEnd.format("HH mm ss Z"), "01 59 59 -08:00", "During the lost hour, the time should roll back to the previous time");
        assert.equal(after.format("HH mm ss Z"), "03 00 00 -07:00", "After the lost hour, the time should match the input time");

        assert.equal(helpers.getUTCOffset(before), -480, "Before the lost hour, the offset should match the non-dst offset");
        assert.equal(helpers.getUTCOffset(atStart), -480, "During the lost hour, the offset should match the non-dst offset");
        assert.equal(helpers.getUTCOffset(atEnd), -480, "During the lost hour, the offset should match the non-dst offset");
        assert.equal(helpers.getUTCOffset(after), -420, "After the lost hour, the offset should match the dst offset");

    });

    specify("invalid input - moveInvalidForward = false - New York", () => {
        datetime.tz.moveInvalidForward = false;

        // the hour from 2am to 3am does not exist on March 11 2011 in America/New_York
        const before = datetime.tz([2012, 2, 11, 1, 59, 59], "America/New_York");
        const atStart = datetime.tz([2012, 2, 11, 2, 0, 0], "America/New_York");
        const atEnd = datetime.tz([2012, 2, 11, 2, 59, 59], "America/New_York");
        const after = datetime.tz([2012, 2, 11, 3, 0, 0], "America/New_York");

        assert.equal(before.format("HH mm ss Z"), "01 59 59 -05:00", "Before the lost hour, the time should match the input time");
        assert.equal(atStart.format("HH mm ss Z"), "01 00 00 -05:00", "During the lost hour, the time should roll back to the previous time");
        assert.equal(atEnd.format("HH mm ss Z"), "01 59 59 -05:00", "During the lost hour, the time should roll back to the previous time");
        assert.equal(after.format("HH mm ss Z"), "03 00 00 -04:00", "After the lost hour, the time should match the input time");

        assert.equal(helpers.getUTCOffset(before), -300, "Before the lost hour, the offset should match the non-dst offset");
        assert.equal(helpers.getUTCOffset(atStart), -300, "During the lost hour, the offset should match the non-dst offset");
        assert.equal(helpers.getUTCOffset(atEnd), -300, "During the lost hour, the offset should match the non-dst offset");
        assert.equal(helpers.getUTCOffset(after), -240, "After the lost hour, the offset should match the dst offset");

    });

    specify("invalid input - moveInvalidForward = true - Los Angeles", () => {
        // datetime.tz.moveInvalidForward = true; Should default to true

        // the hour from 2am to 3am does not exist on March 11 2011 in America/Los_Angeles
        const before = datetime.tz([2012, 2, 11, 1, 59, 59], "America/Los_Angeles");
        const atStart = datetime.tz([2012, 2, 11, 2, 0, 0], "America/Los_Angeles");
        const atEnd = datetime.tz([2012, 2, 11, 2, 59, 59], "America/Los_Angeles");
        const after = datetime.tz([2012, 2, 11, 3, 0, 0], "America/Los_Angeles");

        assert.equal(before.format("HH mm ss Z"), "01 59 59 -08:00", "Before the lost hour, the time should match the input time");
        assert.equal(atStart.format("HH mm ss Z"), "03 00 00 -07:00", "During the lost hour, the time should roll forward to the previous time");
        assert.equal(atEnd.format("HH mm ss Z"), "03 59 59 -07:00", "During the lost hour, the time should roll forward to the previous time");
        assert.equal(after.format("HH mm ss Z"), "03 00 00 -07:00", "After the lost hour, the time should match the input time");

        assert.equal(helpers.getUTCOffset(before), -480, "Before the lost hour, the offset should match the non-dst offset");
        assert.equal(helpers.getUTCOffset(atStart), -420, "During the lost hour, the offset should match the dst offset");
        assert.equal(helpers.getUTCOffset(atEnd), -420, "During the lost hour, the offset should match the dst offset");
        assert.equal(helpers.getUTCOffset(after), -420, "After the lost hour, the offset should match the dst offset");

    });

    specify("invalid input - moveInvalidForward = true - New York", () => {
        // datetime.tz.moveInvalidForward = true; Should default to true

        // the hour from 2am to 3am does not exist on March 11 2011 in America/New_York
        const before = datetime.tz([2012, 2, 11, 1, 59, 59], "America/New_York");
        const atStart = datetime.tz([2012, 2, 11, 2, 0, 0], "America/New_York");
        const atEnd = datetime.tz([2012, 2, 11, 2, 59, 59], "America/New_York");
        const after = datetime.tz([2012, 2, 11, 3, 0, 0], "America/New_York");

        assert.equal(before.format("HH mm ss Z"), "01 59 59 -05:00", "Before the lost hour, the time should match the input time");
        assert.equal(atStart.format("HH mm ss Z"), "03 00 00 -04:00", "During the lost hour, the time should roll forward to the previous time");
        assert.equal(atEnd.format("HH mm ss Z"), "03 59 59 -04:00", "During the lost hour, the time should roll forward to the previous time");
        assert.equal(after.format("HH mm ss Z"), "03 00 00 -04:00", "After the lost hour, the time should match the input time");

        assert.equal(helpers.getUTCOffset(before), -300, "Before the lost hour, the offset should match the non-dst offset");
        assert.equal(helpers.getUTCOffset(atStart), -240, "During the lost hour, the offset should match the dst offset");
        assert.equal(helpers.getUTCOffset(atEnd), -240, "During the lost hour, the offset should match the dst offset");
        assert.equal(helpers.getUTCOffset(after), -240, "After the lost hour, the offset should match the dst offset");

    });

    specify("ambiguous input - moveAmbiguousForward = false - Los Angeles", () => {
        // datetime.tz.moveAmbiguousForward = false; Should default to false

        // the hour from 1am to 2am happens twice on Nov 4 2011 in America/Los_Angeles
        const before = datetime.tz([2012, 10, 4, 0, 59, 59], "America/Los_Angeles");
        const atStart = datetime.tz([2012, 10, 4, 1, 0, 0], "America/Los_Angeles");
        const atEnd = datetime.tz([2012, 10, 4, 1, 59, 59], "America/Los_Angeles");
        const after = datetime.tz([2012, 10, 4, 2, 0, 0], "America/Los_Angeles");

        assert.equal(before.format("HH mm ss Z"), "00 59 59 -07:00", "Before the duplicated hour, the time should match the input time");
        assert.equal(atStart.format("HH mm ss Z"), "01 00 00 -07:00", "During the duplicated hour, the time should match the earlier input time");
        assert.equal(atEnd.format("HH mm ss Z"), "01 59 59 -07:00", "During the duplicated hour, the time should match the earlier input time");
        assert.equal(after.format("HH mm ss Z"), "02 00 00 -08:00", "After the duplicated hour, the time should match the input time");

        assert.equal(helpers.getUTCOffset(before), -420, "Before the duplicated hour, the offset should match the dst offset");
        assert.equal(helpers.getUTCOffset(atStart), -420, "During the duplicated hour, the offset should match the dst offset");
        assert.equal(helpers.getUTCOffset(atEnd), -420, "During the duplicated hour, the offset should match the dst offset");
        assert.equal(helpers.getUTCOffset(after), -480, "After the duplicated hour, the offset should match the non-dst offset");

    });

    specify("ambiguous input - moveAmbiguousForward = false - New York", () => {
        // datetime.tz.moveAmbiguousForward = false; Should default to false

        // the hour from 1am to 2am happens twice on Nov 4 2011 in America/Los_Angeles
        const before = datetime.tz([2012, 10, 4, 0, 59, 59], "America/New_York");
        const atStart = datetime.tz([2012, 10, 4, 1, 0, 0], "America/New_York");
        const atEnd = datetime.tz([2012, 10, 4, 1, 59, 59], "America/New_York");
        const after = datetime.tz([2012, 10, 4, 2, 0, 0], "America/New_York");

        assert.equal(before.format("HH mm ss Z"), "00 59 59 -04:00", "Before the duplicated hour, the time should match the input time");
        assert.equal(atStart.format("HH mm ss Z"), "01 00 00 -04:00", "During the duplicated hour, the time should match the earlier input time");
        assert.equal(atEnd.format("HH mm ss Z"), "01 59 59 -04:00", "During the duplicated hour, the time should match the earlier input time");
        assert.equal(after.format("HH mm ss Z"), "02 00 00 -05:00", "After the duplicated hour, the time should match the input time");

        assert.equal(helpers.getUTCOffset(before), -240, "Before the duplicated hour, the offset should match the dst offset");
        assert.equal(helpers.getUTCOffset(atStart), -240, "During the duplicated hour, the offset should match the dst offset");
        assert.equal(helpers.getUTCOffset(atEnd), -240, "During the duplicated hour, the offset should match the dst offset");
        assert.equal(helpers.getUTCOffset(after), -300, "After the duplicated hour, the offset should match the non-dst offset");

    });

    specify("ambiguous input - moveAmbiguousForward = true - Los Angeles", () => {
        datetime.tz.moveAmbiguousForward = true;

        // the hour from 1am to 2am happens twice on Nov 4 2011 in America/Los_Angeles
        const before = datetime.tz([2012, 10, 4, 0, 59, 59], "America/Los_Angeles");
        const atStart = datetime.tz([2012, 10, 4, 1, 0, 0], "America/Los_Angeles");
        const atEnd = datetime.tz([2012, 10, 4, 1, 59, 59], "America/Los_Angeles");
        const after = datetime.tz([2012, 10, 4, 2, 0, 0], "America/Los_Angeles");

        assert.equal(before.format("HH mm ss Z"), "00 59 59 -07:00", "Before the duplicated hour, the time should match the input time");
        assert.equal(atStart.format("HH mm ss Z"), "01 00 00 -08:00", "During the duplicated hour, the time should match the later input time");
        assert.equal(atEnd.format("HH mm ss Z"), "01 59 59 -08:00", "During the duplicated hour, the time should match the later input time");
        assert.equal(after.format("HH mm ss Z"), "02 00 00 -08:00", "After the duplicated hour, the time should match the input time");

        assert.equal(helpers.getUTCOffset(before), -420, "Before the duplicated hour, the offset should match the dst offset");
        assert.equal(helpers.getUTCOffset(atStart), -480, "During the duplicated hour, the offset should match the non-dst offset");
        assert.equal(helpers.getUTCOffset(atEnd), -480, "During the duplicated hour, the offset should match the non-dst offset");
        assert.equal(helpers.getUTCOffset(after), -480, "After the duplicated hour, the offset should match the non-dst offset");

    });

    specify("ambiguous input - moveAmbiguousForward = true - New York", () => {
        datetime.tz.moveAmbiguousForward = true;

        // the hour from 1am to 2am happens twice on Nov 4 2011 in America/Los_Angeles
        const before = datetime.tz([2012, 10, 4, 0, 59, 59], "America/New_York");
        const atStart = datetime.tz([2012, 10, 4, 1, 0, 0], "America/New_York");
        const atEnd = datetime.tz([2012, 10, 4, 1, 59, 59], "America/New_York");
        const after = datetime.tz([2012, 10, 4, 2, 0, 0], "America/New_York");

        assert.equal(before.format("HH mm ss Z"), "00 59 59 -04:00", "Before the duplicated hour, the time should match the input time");
        assert.equal(atStart.format("HH mm ss Z"), "01 00 00 -05:00", "During the duplicated hour, the time should match the later input time");
        assert.equal(atEnd.format("HH mm ss Z"), "01 59 59 -05:00", "During the duplicated hour, the time should match the later input time");
        assert.equal(after.format("HH mm ss Z"), "02 00 00 -05:00", "After the duplicated hour, the time should match the input time");

        assert.equal(helpers.getUTCOffset(before), -240, "Before the duplicated hour, the offset should match the dst offset");
        assert.equal(helpers.getUTCOffset(atStart), -300, "During the duplicated hour, the offset should match the non-dst offset");
        assert.equal(helpers.getUTCOffset(atEnd), -300, "During the duplicated hour, the offset should match the non-dst offset");
        assert.equal(helpers.getUTCOffset(after), -300, "After the duplicated hour, the offset should match the non-dst offset");

    });

    specify("check needsOffset in datetime.tz (America/Los_Angeles)", () => {
        const name = "America/Los_Angeles";
        const tests = [
            [datetime.tz([2012, 5, 1], name), "2012-06-01 00:00:00 -07:00", "[2012, 5, 1]"],
            [datetime.tz("2012-06-01", name), "2012-06-01 00:00:00 -07:00", "2012-06-01"],
            [datetime.tz("2012-06-01 07:00:00+00:00", name), "2012-06-01 00:00:00 -07:00", "2012-06-01 00:00:00+00:00"],
            [datetime.tz(1338534000000, name), "2012-06-01 00:00:00 -07:00", "1338534000000"],
            [datetime.tz(new Date(1338534000000), name), "2012-06-01 00:00:00 -07:00", "new Date(1338534000000)"],
            [datetime.tz({ y: 2012, M: 5, d: 1 }, name), "2012-06-01 00:00:00 -07:00", "{y : 2012, M : 5, d : 1}"],
            [datetime.tz(datetime.utc([2012, 5, 1, 7]), name), "2012-06-01 00:00:00 -07:00", "datetime.utc([2012, 5, 1, 7])"]
        ];
        let i;
        let actual;
        let message;
        let expected;

        for (i = 0; i < tests.length; i++) {
            actual = tests[i][0].format("YYYY-MM-DD HH:mm:ss Z");
            expected = tests[i][1];
            message = tests[i][2];
            assert.equal(actual, expected, `Parsing ${message} in America/Los_Angeles should equal ${expected}`);
        }

    });

    specify("check needsOffset in datetime.tz (America/New_York)", () => {
        const name = "America/New_York";
        const tests = [
            [datetime.tz([2012, 5, 1], name), "2012-06-01 00:00:00 -04:00", "[2012, 5, 1]"],
            [datetime.tz("2012-06-01", name), "2012-06-01 00:00:00 -04:00", "2012-06-01"],
            [datetime.tz("2012-06-01 04:00:00+00:00", name), "2012-06-01 00:00:00 -04:00", "2012-06-01 00:00:00+00:00"],
            [datetime.tz(1338523200000, name), "2012-06-01 00:00:00 -04:00", "1338534000000"],
            [datetime.tz(new Date(1338523200000), name), "2012-06-01 00:00:00 -04:00", "new Date(1338534000000)"],
            [datetime.tz({ y: 2012, M: 5, d: 1 }, name), "2012-06-01 00:00:00 -04:00", "{y : 2012, M : 5, d : 1}"],
            [datetime.tz(datetime.utc([2012, 5, 1, 4]), name), "2012-06-01 00:00:00 -04:00", "datetime.utc([2012, 5, 1, 4])"]
        ];
        let i;
        let actual;
        let message;
        let expected;

        for (i = 0; i < tests.length; i++) {
            actual = tests[i][0].format("YYYY-MM-DD HH:mm:ss Z");
            expected = tests[i][1];
            message = tests[i][2];
            assert.equal(actual, expected, `Parsing ${message} in America/New_York should equal ${expected}`);
        }

    });

    specify("check needsOffset in datetime.tz with timestamp formats", () => {
        const tests = [
            ["1338534000000", "x", "America/New_York", 1338534000000, "2012-06-01T03:00:00-04:00"],
            ["1338534000.000", "X", "America/New_York", 1338534000000, "2012-06-01T03:00:00-04:00"],
            ["1338534000000", "x", "America/Los_Angeles", 1338534000000, "2012-06-01T00:00:00-07:00"],
            ["1338534000.000", "X", "America/Los_Angeles", 1338534000000, "2012-06-01T00:00:00-07:00"]
        ];
        let i;
        let parsed;
        let input;
        let format;
        let timezone;
        let expectedValue;
        let expectedFormat;

        for (i = 0; i < tests.length; i++) {
            input = tests[i][0];
            format = tests[i][1];
            timezone = tests[i][2];
            expectedValue = tests[i][3];
            expectedFormat = tests[i][4];
            parsed = datetime.tz(input, format, true, timezone);
            assert.equal(parsed.valueOf(), expectedValue, `Parsing ${input} with format ${format} should have value ${expectedValue}`);
            assert.equal(parsed.format(), expectedFormat, `Parsing ${input} with format ${format} should equal ${expectedFormat}`);
        }

    });

    specify("parse in default zone", () => {
        datetime.tz.setDefault("America/New_York");

        const tests = [
            [datetime([2012, 5, 1]), "2012-06-01 00:00:00 -04:00", "[2012, 5, 1]"],
            [datetime("2012-06-01"), "2012-06-01 00:00:00 -04:00", "2012-06-01"],
            [datetime("2012-06-01 04:00:00+00:00"), "2012-06-01 00:00:00 -04:00", "2012-06-01 00:00:00+00:00"],
            [datetime(1338523200000), "2012-06-01 00:00:00 -04:00", "1338534000000"],
            [datetime(new Date(1338523200000)), "2012-06-01 00:00:00 -04:00", "new Date(1338534000000)"],
            [datetime({ y: 2012, M: 5, d: 1 }), "2012-06-01 00:00:00 -04:00", "{y : 2012, M : 5, d : 1}"]
        ];
        let i;
        let actual;
        let message;
        let expected;

        for (i = 0; i < tests.length; i++) {
            actual = tests[i][0].format("YYYY-MM-DD HH:mm:ss Z");
            expected = tests[i][1];
            message = tests[i][2];
            assert.equal(actual, expected, `Parsing ${message} in America/New_York should equal ${expected}`);
        }
    });
});
