

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Africa/Bangui", () => {
        helpers.testYear("Africa/Bangui", [["1919-08-31T23:46:23+00:00", "23:59:59", "LMT", -816 / 60], ["1919-08-31T23:46:24+00:00", "00:46:24", "WAT", -60]]);
    });
});
