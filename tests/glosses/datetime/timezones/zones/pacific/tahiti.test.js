

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Pacific/Tahiti", () => {
        helpers.testYear("Pacific/Tahiti", [["1912-10-01T09:58:15+00:00", "23:59:59", "LMT", 35896 / 60], ["1912-10-01T09:58:16+00:00", "23:58:16", "-10", 600]]);
    });
});
