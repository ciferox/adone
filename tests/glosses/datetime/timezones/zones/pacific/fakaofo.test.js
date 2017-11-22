

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Pacific/Fakaofo", () => {
        helpers.testYear("Pacific/Fakaofo", [["2011-12-30T10:59:59+00:00", "23:59:59", "-11", 660], ["2011-12-30T11:00:00+00:00", "00:00:00", "+13", -780]]);
    });
});
