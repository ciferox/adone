

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Antarctica/DumontDUrville", () => {
        helpers.testYear("Antarctica/DumontDUrville", [["1946-12-31T23:59:59+00:00", "23:59:59", "-00", 0]]);
        helpers.testYear("Antarctica/DumontDUrville", [["1947-01-01T00:00:00+00:00", "10:00:00", "+10", -600]]);
        helpers.testYear("Antarctica/DumontDUrville", [["1952-01-13T13:59:59+00:00", "23:59:59", "+10", -600], ["1952-01-13T14:00:00+00:00", "14:00:00", "-00", 0]]);
        helpers.testYear("Antarctica/DumontDUrville", [["1956-10-31T23:59:59+00:00", "23:59:59", "-00", 0], ["1956-11-01T00:00:00+00:00", "10:00:00", "+10", -600]]);
    });
});
