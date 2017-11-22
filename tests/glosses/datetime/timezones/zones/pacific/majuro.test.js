

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Pacific/Majuro", () => {
        helpers.testYear("Pacific/Majuro", [["1969-09-30T12:59:59+00:00", "23:59:59", "+11", -660], ["1969-09-30T13:00:00+00:00", "01:00:00", "+12", -720]]);
    });
});
