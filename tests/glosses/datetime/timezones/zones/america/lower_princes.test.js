

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("America/Lower_Princes", () => {
        helpers.testYear("America/Lower_Princes", [["1912-02-12T04:35:46+00:00", "23:59:59", "LMT", 16547 / 60], ["1912-02-12T04:35:47+00:00", "00:05:47", "-0430", 270]]);
        helpers.testYear("America/Lower_Princes", [["1965-01-01T04:29:59+00:00", "23:59:59", "-0430", 270], ["1965-01-01T04:30:00+00:00", "00:30:00", "AST", 240]]);
    });
});
