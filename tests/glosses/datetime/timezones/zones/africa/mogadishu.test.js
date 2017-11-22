

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Africa/Mogadishu", () => {
        helpers.testYear("Africa/Mogadishu", [["1928-06-30T21:32:43+00:00", "23:59:59", "LMT", -8836 / 60], ["1928-06-30T21:32:44+00:00", "00:32:44", "EAT", -180]]);
        helpers.testYear("Africa/Mogadishu", [["1929-12-31T20:59:59+00:00", "23:59:59", "EAT", -180], ["1929-12-31T21:00:00+00:00", "23:30:00", "+0230", -150]]);
        helpers.testYear("Africa/Mogadishu", [["1939-12-31T21:29:59+00:00", "23:59:59", "+0230", -150], ["1939-12-31T21:30:00+00:00", "00:15:00", "+0245", -165]]);
        helpers.testYear("Africa/Mogadishu", [["1959-12-31T21:14:59+00:00", "23:59:59", "+0245", -165], ["1959-12-31T21:15:00+00:00", "00:15:00", "EAT", -180]]);
    });
});
