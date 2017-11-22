

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("America/Bogota", () => {
        helpers.testYear("America/Bogota", [["1914-11-23T04:56:15+00:00", "23:59:59", "BMT", 17776 / 60], ["1914-11-23T04:56:16+00:00", "23:56:16", "-05", 300]]);
        helpers.testYear("America/Bogota", [["1992-05-03T04:59:59+00:00", "23:59:59", "-05", 300], ["1992-05-03T05:00:00+00:00", "01:00:00", "-04", 240]]);
        helpers.testYear("America/Bogota", [["1993-04-04T03:59:59+00:00", "23:59:59", "-04", 240], ["1993-04-04T04:00:00+00:00", "23:00:00", "-05", 300]]);
    });
});
