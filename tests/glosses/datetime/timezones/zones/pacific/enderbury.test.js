

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Pacific/Enderbury", () => {
        helpers.testYear("Pacific/Enderbury", [["1979-10-01T11:59:59+00:00", "23:59:59", "-12", 720], ["1979-10-01T12:00:00+00:00", "01:00:00", "-11", 660]]);
        helpers.testYear("Pacific/Enderbury", [["1995-01-01T10:59:59+00:00", "23:59:59", "-11", 660], ["1995-01-01T11:00:00+00:00", "00:00:00", "+13", -780]]);
    });
});
