

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Pacific/Pago_Pago", () => {
        helpers.testGuess("Pacific/Pago_Pago", {
            offset: true,
            abbr: true
        });
        helpers.testYear("Pacific/Pago_Pago", [["1911-01-01T11:22:47+00:00", "23:59:59", "LMT", 40968 / 60], ["1911-01-01T11:22:48+00:00", "00:22:48", "SST", 660]]);
    });
});
