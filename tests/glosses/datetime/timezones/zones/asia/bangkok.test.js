

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Asia/Bangkok", () => {
        helpers.testYear("Asia/Bangkok", [["1920-03-31T17:17:55+00:00", "23:59:59", "BMT", -24124 / 60], ["1920-03-31T17:17:56+00:00", "00:17:56", "+07", -420]]);
    });
});
