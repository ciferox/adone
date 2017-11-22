

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Antarctica/Mawson", () => {
        helpers.testYear("Antarctica/Mawson", [["1954-02-12T23:59:59+00:00", "23:59:59", "-00", 0], ["1954-02-13T00:00:00+00:00", "06:00:00", "+06", -360]]);
        helpers.testYear("Antarctica/Mawson", [["2009-10-17T19:59:59+00:00", "01:59:59", "+06", -360], ["2009-10-17T20:00:00+00:00", "01:00:00", "+05", -300]]);
    });
});
