

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Antarctica/Syowa", () => {
        helpers.testYear("Antarctica/Syowa", [["1957-01-28T23:59:59+00:00", "23:59:59", "-00", 0], ["1957-01-29T00:00:00+00:00", "03:00:00", "+03", -180]]);
    });
});
