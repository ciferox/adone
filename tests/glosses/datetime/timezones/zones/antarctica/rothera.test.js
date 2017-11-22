

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Antarctica/Rothera", () => {
        helpers.testYear("Antarctica/Rothera", [["1976-11-30T23:59:59+00:00", "23:59:59", "-00", 0], ["1976-12-01T00:00:00+00:00", "21:00:00", "-03", 180]]);
    });
});
