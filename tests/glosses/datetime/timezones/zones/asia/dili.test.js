

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Asia/Dili", () => {
        helpers.testYear("Asia/Dili", [["1911-12-31T15:37:39+00:00", "23:59:59", "LMT", -30140 / 60], ["1911-12-31T15:37:40+00:00", "23:37:40", "+08", -480]]);
        helpers.testYear("Asia/Dili", [["1942-02-21T14:59:59+00:00", "22:59:59", "+08", -480], ["1942-02-21T15:00:00+00:00", "00:00:00", "+09", -540]]);
        helpers.testYear("Asia/Dili", [["1976-05-02T14:59:59+00:00", "23:59:59", "+09", -540], ["1976-05-02T15:00:00+00:00", "23:00:00", "+08", -480]]);
        helpers.testYear("Asia/Dili", [["2000-09-16T15:59:59+00:00", "23:59:59", "+08", -480], ["2000-09-16T16:00:00+00:00", "01:00:00", "+09", -540]]);
    });
});
