

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Pacific/Guam", () => {
        helpers.testGuess("Pacific/Guam", {
            offset: false,
            abbr: true
        });
        helpers.testYear("Pacific/Guam", [["2000-12-22T13:59:59+00:00", "23:59:59", "GST", -600], ["2000-12-22T14:00:00+00:00", "00:00:00", "ChST", -600]]);
    });
});
