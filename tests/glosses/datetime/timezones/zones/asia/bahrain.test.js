

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Asia/Bahrain", () => {
        helpers.testYear("Asia/Bahrain", [["1919-12-31T20:33:51+00:00", "23:59:59", "LMT", -12368 / 60], ["1919-12-31T20:33:52+00:00", "00:33:52", "+04", -240]]);
        helpers.testYear("Asia/Bahrain", [["1972-05-31T19:59:59+00:00", "23:59:59", "+04", -240], ["1972-05-31T20:00:00+00:00", "23:00:00", "+03", -180]]);
    });
});
