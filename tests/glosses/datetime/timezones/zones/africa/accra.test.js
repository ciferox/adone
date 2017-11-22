

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Africa/Accra", () => {
        helpers.testYear("Africa/Accra", [["1918-01-01T00:00:51+00:00", "23:59:59", "LMT", 52 / 60], ["1918-01-01T00:00:52+00:00", "00:00:52", "GMT", 0]]);
        helpers.testYear("Africa/Accra", [["1920-08-31T23:59:59+00:00", "23:59:59", "GMT", 0], ["1920-09-01T00:00:00+00:00", "00:20:00", "+0020", -20], ["1920-12-30T23:39:59+00:00", "23:59:59", "+0020", -20], ["1920-12-30T23:40:00+00:00", "23:40:00", "GMT", 0]]);
        helpers.testYear("Africa/Accra", [["1921-08-31T23:59:59+00:00", "23:59:59", "GMT", 0], ["1921-09-01T00:00:00+00:00", "00:20:00", "+0020", -20], ["1921-12-30T23:39:59+00:00", "23:59:59", "+0020", -20], ["1921-12-30T23:40:00+00:00", "23:40:00", "GMT", 0]]);
        helpers.testYear("Africa/Accra", [["1922-08-31T23:59:59+00:00", "23:59:59", "GMT", 0], ["1922-09-01T00:00:00+00:00", "00:20:00", "+0020", -20], ["1922-12-30T23:39:59+00:00", "23:59:59", "+0020", -20], ["1922-12-30T23:40:00+00:00", "23:40:00", "GMT", 0]]);
        helpers.testYear("Africa/Accra", [["1923-08-31T23:59:59+00:00", "23:59:59", "GMT", 0], ["1923-09-01T00:00:00+00:00", "00:20:00", "+0020", -20], ["1923-12-30T23:39:59+00:00", "23:59:59", "+0020", -20], ["1923-12-30T23:40:00+00:00", "23:40:00", "GMT", 0]]);
        helpers.testYear("Africa/Accra", [["1924-08-31T23:59:59+00:00", "23:59:59", "GMT", 0], ["1924-09-01T00:00:00+00:00", "00:20:00", "+0020", -20], ["1924-12-30T23:39:59+00:00", "23:59:59", "+0020", -20], ["1924-12-30T23:40:00+00:00", "23:40:00", "GMT", 0]]);
        helpers.testYear("Africa/Accra", [["1925-08-31T23:59:59+00:00", "23:59:59", "GMT", 0], ["1925-09-01T00:00:00+00:00", "00:20:00", "+0020", -20], ["1925-12-30T23:39:59+00:00", "23:59:59", "+0020", -20], ["1925-12-30T23:40:00+00:00", "23:40:00", "GMT", 0]]);
        helpers.testYear("Africa/Accra", [["1926-08-31T23:59:59+00:00", "23:59:59", "GMT", 0], ["1926-09-01T00:00:00+00:00", "00:20:00", "+0020", -20], ["1926-12-30T23:39:59+00:00", "23:59:59", "+0020", -20], ["1926-12-30T23:40:00+00:00", "23:40:00", "GMT", 0]]);
        helpers.testYear("Africa/Accra", [["1927-08-31T23:59:59+00:00", "23:59:59", "GMT", 0], ["1927-09-01T00:00:00+00:00", "00:20:00", "+0020", -20], ["1927-12-30T23:39:59+00:00", "23:59:59", "+0020", -20], ["1927-12-30T23:40:00+00:00", "23:40:00", "GMT", 0]]);
        helpers.testYear("Africa/Accra", [["1928-08-31T23:59:59+00:00", "23:59:59", "GMT", 0], ["1928-09-01T00:00:00+00:00", "00:20:00", "+0020", -20], ["1928-12-30T23:39:59+00:00", "23:59:59", "+0020", -20], ["1928-12-30T23:40:00+00:00", "23:40:00", "GMT", 0]]);
        helpers.testYear("Africa/Accra", [["1929-08-31T23:59:59+00:00", "23:59:59", "GMT", 0], ["1929-09-01T00:00:00+00:00", "00:20:00", "+0020", -20], ["1929-12-30T23:39:59+00:00", "23:59:59", "+0020", -20], ["1929-12-30T23:40:00+00:00", "23:40:00", "GMT", 0]]);
        helpers.testYear("Africa/Accra", [["1930-08-31T23:59:59+00:00", "23:59:59", "GMT", 0], ["1930-09-01T00:00:00+00:00", "00:20:00", "+0020", -20], ["1930-12-30T23:39:59+00:00", "23:59:59", "+0020", -20], ["1930-12-30T23:40:00+00:00", "23:40:00", "GMT", 0]]);
        helpers.testYear("Africa/Accra", [["1931-08-31T23:59:59+00:00", "23:59:59", "GMT", 0], ["1931-09-01T00:00:00+00:00", "00:20:00", "+0020", -20], ["1931-12-30T23:39:59+00:00", "23:59:59", "+0020", -20], ["1931-12-30T23:40:00+00:00", "23:40:00", "GMT", 0]]);
        helpers.testYear("Africa/Accra", [["1932-08-31T23:59:59+00:00", "23:59:59", "GMT", 0], ["1932-09-01T00:00:00+00:00", "00:20:00", "+0020", -20], ["1932-12-30T23:39:59+00:00", "23:59:59", "+0020", -20], ["1932-12-30T23:40:00+00:00", "23:40:00", "GMT", 0]]);
        helpers.testYear("Africa/Accra", [["1933-08-31T23:59:59+00:00", "23:59:59", "GMT", 0], ["1933-09-01T00:00:00+00:00", "00:20:00", "+0020", -20], ["1933-12-30T23:39:59+00:00", "23:59:59", "+0020", -20], ["1933-12-30T23:40:00+00:00", "23:40:00", "GMT", 0]]);
        helpers.testYear("Africa/Accra", [["1934-08-31T23:59:59+00:00", "23:59:59", "GMT", 0], ["1934-09-01T00:00:00+00:00", "00:20:00", "+0020", -20], ["1934-12-30T23:39:59+00:00", "23:59:59", "+0020", -20], ["1934-12-30T23:40:00+00:00", "23:40:00", "GMT", 0]]);
        helpers.testYear("Africa/Accra", [["1935-08-31T23:59:59+00:00", "23:59:59", "GMT", 0], ["1935-09-01T00:00:00+00:00", "00:20:00", "+0020", -20], ["1935-12-30T23:39:59+00:00", "23:59:59", "+0020", -20], ["1935-12-30T23:40:00+00:00", "23:40:00", "GMT", 0]]);
        helpers.testYear("Africa/Accra", [["1936-08-31T23:59:59+00:00", "23:59:59", "GMT", 0], ["1936-09-01T00:00:00+00:00", "00:20:00", "+0020", -20], ["1936-12-30T23:39:59+00:00", "23:59:59", "+0020", -20], ["1936-12-30T23:40:00+00:00", "23:40:00", "GMT", 0]]);
        helpers.testYear("Africa/Accra", [["1937-08-31T23:59:59+00:00", "23:59:59", "GMT", 0], ["1937-09-01T00:00:00+00:00", "00:20:00", "+0020", -20], ["1937-12-30T23:39:59+00:00", "23:59:59", "+0020", -20], ["1937-12-30T23:40:00+00:00", "23:40:00", "GMT", 0]]);
        helpers.testYear("Africa/Accra", [["1938-08-31T23:59:59+00:00", "23:59:59", "GMT", 0], ["1938-09-01T00:00:00+00:00", "00:20:00", "+0020", -20], ["1938-12-30T23:39:59+00:00", "23:59:59", "+0020", -20], ["1938-12-30T23:40:00+00:00", "23:40:00", "GMT", 0]]);
        helpers.testYear("Africa/Accra", [["1939-08-31T23:59:59+00:00", "23:59:59", "GMT", 0], ["1939-09-01T00:00:00+00:00", "00:20:00", "+0020", -20], ["1939-12-30T23:39:59+00:00", "23:59:59", "+0020", -20], ["1939-12-30T23:40:00+00:00", "23:40:00", "GMT", 0]]);
        helpers.testYear("Africa/Accra", [["1940-08-31T23:59:59+00:00", "23:59:59", "GMT", 0], ["1940-09-01T00:00:00+00:00", "00:20:00", "+0020", -20], ["1940-12-30T23:39:59+00:00", "23:59:59", "+0020", -20], ["1940-12-30T23:40:00+00:00", "23:40:00", "GMT", 0]]);
        helpers.testYear("Africa/Accra", [["1941-08-31T23:59:59+00:00", "23:59:59", "GMT", 0], ["1941-09-01T00:00:00+00:00", "00:20:00", "+0020", -20], ["1941-12-30T23:39:59+00:00", "23:59:59", "+0020", -20], ["1941-12-30T23:40:00+00:00", "23:40:00", "GMT", 0]]);
        helpers.testYear("Africa/Accra", [["1942-08-31T23:59:59+00:00", "23:59:59", "GMT", 0], ["1942-09-01T00:00:00+00:00", "00:20:00", "+0020", -20], ["1942-12-30T23:39:59+00:00", "23:59:59", "+0020", -20], ["1942-12-30T23:40:00+00:00", "23:40:00", "GMT", 0]]);
    });
});
