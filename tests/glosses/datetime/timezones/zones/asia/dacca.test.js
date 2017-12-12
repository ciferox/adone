

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Asia/Dacca", () => {
        helpers.testYear("Asia/Dacca", [["1941-09-30T18:06:39+00:00", "23:59:59", "HMT", -21200 / 60], ["1941-09-30T18:06:40+00:00", "00:36:40", "+0630", -390]]);
        helpers.testYear("Asia/Dacca", [["1942-05-14T17:29:59+00:00", "23:59:59", "+0630", -390], ["1942-05-14T17:30:00+00:00", "23:00:00", "+0530", -330], ["1942-08-31T18:29:59+00:00", "23:59:59", "+0530", -330], ["1942-08-31T18:30:00+00:00", "01:00:00", "+0630", -390]]);
        helpers.testYear("Asia/Dacca", [["1951-09-29T17:29:59+00:00", "23:59:59", "+0630", -390], ["1951-09-29T17:30:00+00:00", "23:30:00", "+06", -360]]);
        helpers.testYear("Asia/Dacca", [["2009-06-19T16:59:59+00:00", "22:59:59", "+06", -360], ["2009-06-19T17:00:00+00:00", "00:00:00", "+07", -420], ["2009-12-31T16:59:59+00:00", "23:59:59", "+07", -420], ["2009-12-31T17:00:00+00:00", "23:00:00", "+06", -360]]);
    });
});