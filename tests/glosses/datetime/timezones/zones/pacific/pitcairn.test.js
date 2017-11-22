

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Pacific/Pitcairn", () => {
        helpers.testYear("Pacific/Pitcairn", [["1998-04-27T08:29:59+00:00", "23:59:59", "-0830", 510], ["1998-04-27T08:30:00+00:00", "00:30:00", "-08", 480]]);
    });
});
