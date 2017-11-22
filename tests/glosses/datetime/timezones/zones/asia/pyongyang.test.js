

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Asia/Pyongyang", () => {
        helpers.testYear("Asia/Pyongyang", [["1908-03-31T15:36:59+00:00", "23:59:59", "LMT", -503], ["1908-03-31T15:37:00+00:00", "00:07:00", "KST", -510]]);
        helpers.testYear("Asia/Pyongyang", [["1911-12-31T15:29:59+00:00", "23:59:59", "KST", -510], ["1911-12-31T15:30:00+00:00", "00:30:00", "JST", -540]]);
        helpers.testYear("Asia/Pyongyang", [["1945-08-23T14:59:59+00:00", "23:59:59", "JST", -540], ["1945-08-23T15:00:00+00:00", "00:00:00", "KST", -540]]);
        helpers.testYear("Asia/Pyongyang", [["2015-08-14T14:59:59+00:00", "23:59:59", "KST", -540], ["2015-08-14T15:00:00+00:00", "23:30:00", "KST", -510]]);
    });
});
