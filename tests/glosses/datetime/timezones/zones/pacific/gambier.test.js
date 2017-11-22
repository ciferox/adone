

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Pacific/Gambier", () => {
        helpers.testYear("Pacific/Gambier", [["1912-10-01T08:59:47+00:00", "23:59:59", "LMT", 32388 / 60], ["1912-10-01T08:59:48+00:00", "23:59:48", "-09", 540]]);
    });
});
