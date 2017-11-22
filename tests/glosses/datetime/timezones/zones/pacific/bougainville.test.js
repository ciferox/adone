

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Pacific/Bougainville", () => {
        helpers.testYear("Pacific/Bougainville", [["1942-06-30T13:59:59+00:00", "23:59:59", "+10", -600], ["1942-06-30T14:00:00+00:00", "23:00:00", "+09", -540]]);
        helpers.testYear("Pacific/Bougainville", [["1945-08-20T14:59:59+00:00", "23:59:59", "+09", -540], ["1945-08-20T15:00:00+00:00", "01:00:00", "+10", -600]]);
        helpers.testYear("Pacific/Bougainville", [["2014-12-27T15:59:59+00:00", "01:59:59", "+10", -600], ["2014-12-27T16:00:00+00:00", "03:00:00", "+11", -660]]);
    });
});
