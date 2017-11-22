

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("America/Guayaquil", () => {
        helpers.testYear("America/Guayaquil", [["1931-01-01T05:13:59+00:00", "23:59:59", "QMT", 314], ["1931-01-01T05:14:00+00:00", "00:14:00", "-05", 300]]);
        helpers.testYear("America/Guayaquil", [["1992-11-28T04:59:59+00:00", "23:59:59", "-05", 300], ["1992-11-28T05:00:00+00:00", "01:00:00", "-04", 240]]);
        helpers.testYear("America/Guayaquil", [["1993-02-05T03:59:59+00:00", "23:59:59", "-04", 240], ["1993-02-05T04:00:00+00:00", "23:00:00", "-05", 300]]);
    });
});
