

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Africa/Banjul", () => {
        helpers.testYear("Africa/Banjul", [["1912-01-01T00:16:07+00:00", "23:59:59", "LMT", 968 / 60], ["1912-01-01T00:16:08+00:00", "00:16:08", "GMT", 0]]);
    });
});
