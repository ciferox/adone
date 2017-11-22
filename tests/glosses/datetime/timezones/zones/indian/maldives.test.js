

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Indian/Maldives", () => {
        helpers.testYear("Indian/Maldives", [["1959-12-31T19:05:59+00:00", "23:59:59", "MMT", -294], ["1959-12-31T19:06:00+00:00", "00:06:00", "+05", -300]]);
    });
});
