

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Africa/Maseru", () => {
        helpers.testYear("Africa/Maseru", [["1903-02-28T22:29:59+00:00", "23:59:59", "SAST", -90], ["1903-02-28T22:30:00+00:00", "00:30:00", "SAST", -120]]);
        helpers.testYear("Africa/Maseru", [["1942-09-19T23:59:59+00:00", "01:59:59", "SAST", -120], ["1942-09-20T00:00:00+00:00", "03:00:00", "SAST", -180]]);
        helpers.testYear("Africa/Maseru", [["1943-03-20T22:59:59+00:00", "01:59:59", "SAST", -180], ["1943-03-20T23:00:00+00:00", "01:00:00", "SAST", -120], ["1943-09-18T23:59:59+00:00", "01:59:59", "SAST", -120], ["1943-09-19T00:00:00+00:00", "03:00:00", "SAST", -180]]);
        helpers.testYear("Africa/Maseru", [["1944-03-18T22:59:59+00:00", "01:59:59", "SAST", -180], ["1944-03-18T23:00:00+00:00", "01:00:00", "SAST", -120]]);
    });
});
