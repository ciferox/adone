

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Pacific/Marquesas", () => {
        helpers.testYear("Pacific/Marquesas", [["1912-10-01T09:17:59+00:00", "23:59:59", "LMT", 558], ["1912-10-01T09:18:00+00:00", "23:48:00", "-0930", 570]]);
    });
});
