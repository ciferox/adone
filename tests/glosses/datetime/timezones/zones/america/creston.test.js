

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("America/Creston", () => {
        helpers.testYear("America/Creston", [["1916-10-01T06:59:59+00:00", "23:59:59", "MST", 420], ["1916-10-01T07:00:00+00:00", "23:00:00", "PST", 480]]);
        helpers.testYear("America/Creston", [["1918-06-02T07:59:59+00:00", "23:59:59", "PST", 480], ["1918-06-02T08:00:00+00:00", "01:00:00", "MST", 420]]);
    });
});
