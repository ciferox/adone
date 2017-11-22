

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Indian/Mahe", () => {
        helpers.testYear("Indian/Mahe", [["1906-05-31T20:18:11+00:00", "23:59:59", "LMT", -13308 / 60], ["1906-05-31T20:18:12+00:00", "00:18:12", "+04", -240]]);
    });
});
