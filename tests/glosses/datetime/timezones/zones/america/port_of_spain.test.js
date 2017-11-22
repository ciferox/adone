

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("America/Port_of_Spain", () => {
        helpers.testYear("America/Port_of_Spain", [["1912-03-02T04:06:03+00:00", "23:59:59", "LMT", 14764 / 60], ["1912-03-02T04:06:04+00:00", "00:06:04", "AST", 240]]);
    });
});
