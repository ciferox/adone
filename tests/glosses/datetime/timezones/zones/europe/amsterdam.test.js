

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Europe/Amsterdam", () => {
        helpers.testYear("Europe/Amsterdam", [["1916-04-30T23:40:27+00:00", "23:59:59", "AMT", -1172 / 60], ["1916-04-30T23:40:28+00:00", "01:00:00", "NST", -4772 / 60], ["1916-09-30T22:40:27+00:00", "23:59:59", "NST", -4772 / 60], ["1916-09-30T22:40:28+00:00", "23:00:00", "AMT", -1172 / 60]]);
        helpers.testYear("Europe/Amsterdam", [["1917-04-16T01:40:27+00:00", "01:59:59", "AMT", -1172 / 60], ["1917-04-16T01:40:28+00:00", "03:00:00", "NST", -4772 / 60], ["1917-09-17T01:40:27+00:00", "02:59:59", "NST", -4772 / 60], ["1917-09-17T01:40:28+00:00", "02:00:00", "AMT", -1172 / 60]]);
        helpers.testYear("Europe/Amsterdam", [["1918-04-01T01:40:27+00:00", "01:59:59", "AMT", -1172 / 60], ["1918-04-01T01:40:28+00:00", "03:00:00", "NST", -4772 / 60], ["1918-09-30T01:40:27+00:00", "02:59:59", "NST", -4772 / 60], ["1918-09-30T01:40:28+00:00", "02:00:00", "AMT", -1172 / 60]]);
        helpers.testYear("Europe/Amsterdam", [["1919-04-07T01:40:27+00:00", "01:59:59", "AMT", -1172 / 60], ["1919-04-07T01:40:28+00:00", "03:00:00", "NST", -4772 / 60], ["1919-09-29T01:40:27+00:00", "02:59:59", "NST", -4772 / 60], ["1919-09-29T01:40:28+00:00", "02:00:00", "AMT", -1172 / 60]]);
        helpers.testYear("Europe/Amsterdam", [["1920-04-05T01:40:27+00:00", "01:59:59", "AMT", -1172 / 60], ["1920-04-05T01:40:28+00:00", "03:00:00", "NST", -4772 / 60], ["1920-09-27T01:40:27+00:00", "02:59:59", "NST", -4772 / 60], ["1920-09-27T01:40:28+00:00", "02:00:00", "AMT", -1172 / 60]]);
        helpers.testYear("Europe/Amsterdam", [["1921-04-04T01:40:27+00:00", "01:59:59", "AMT", -1172 / 60], ["1921-04-04T01:40:28+00:00", "03:00:00", "NST", -4772 / 60], ["1921-09-26T01:40:27+00:00", "02:59:59", "NST", -4772 / 60], ["1921-09-26T01:40:28+00:00", "02:00:00", "AMT", -1172 / 60]]);
        helpers.testYear("Europe/Amsterdam", [["1922-03-26T01:40:27+00:00", "01:59:59", "AMT", -1172 / 60], ["1922-03-26T01:40:28+00:00", "03:00:00", "NST", -4772 / 60], ["1922-10-08T01:40:27+00:00", "02:59:59", "NST", -4772 / 60], ["1922-10-08T01:40:28+00:00", "02:00:00", "AMT", -1172 / 60]]);
        helpers.testYear("Europe/Amsterdam", [["1923-06-01T01:40:27+00:00", "01:59:59", "AMT", -1172 / 60], ["1923-06-01T01:40:28+00:00", "03:00:00", "NST", -4772 / 60], ["1923-10-07T01:40:27+00:00", "02:59:59", "NST", -4772 / 60], ["1923-10-07T01:40:28+00:00", "02:00:00", "AMT", -1172 / 60]]);
        helpers.testYear("Europe/Amsterdam", [["1924-03-30T01:40:27+00:00", "01:59:59", "AMT", -1172 / 60], ["1924-03-30T01:40:28+00:00", "03:00:00", "NST", -4772 / 60], ["1924-10-05T01:40:27+00:00", "02:59:59", "NST", -4772 / 60], ["1924-10-05T01:40:28+00:00", "02:00:00", "AMT", -1172 / 60]]);
        helpers.testYear("Europe/Amsterdam", [["1925-06-05T01:40:27+00:00", "01:59:59", "AMT", -1172 / 60], ["1925-06-05T01:40:28+00:00", "03:00:00", "NST", -4772 / 60], ["1925-10-04T01:40:27+00:00", "02:59:59", "NST", -4772 / 60], ["1925-10-04T01:40:28+00:00", "02:00:00", "AMT", -1172 / 60]]);
        helpers.testYear("Europe/Amsterdam", [["1926-05-15T01:40:27+00:00", "01:59:59", "AMT", -1172 / 60], ["1926-05-15T01:40:28+00:00", "03:00:00", "NST", -4772 / 60], ["1926-10-03T01:40:27+00:00", "02:59:59", "NST", -4772 / 60], ["1926-10-03T01:40:28+00:00", "02:00:00", "AMT", -1172 / 60]]);
        helpers.testYear("Europe/Amsterdam", [["1927-05-15T01:40:27+00:00", "01:59:59", "AMT", -1172 / 60], ["1927-05-15T01:40:28+00:00", "03:00:00", "NST", -4772 / 60], ["1927-10-02T01:40:27+00:00", "02:59:59", "NST", -4772 / 60], ["1927-10-02T01:40:28+00:00", "02:00:00", "AMT", -1172 / 60]]);
        helpers.testYear("Europe/Amsterdam", [["1928-05-15T01:40:27+00:00", "01:59:59", "AMT", -1172 / 60], ["1928-05-15T01:40:28+00:00", "03:00:00", "NST", -4772 / 60], ["1928-10-07T01:40:27+00:00", "02:59:59", "NST", -4772 / 60], ["1928-10-07T01:40:28+00:00", "02:00:00", "AMT", -1172 / 60]]);
        helpers.testYear("Europe/Amsterdam", [["1929-05-15T01:40:27+00:00", "01:59:59", "AMT", -1172 / 60], ["1929-05-15T01:40:28+00:00", "03:00:00", "NST", -4772 / 60], ["1929-10-06T01:40:27+00:00", "02:59:59", "NST", -4772 / 60], ["1929-10-06T01:40:28+00:00", "02:00:00", "AMT", -1172 / 60]]);
        helpers.testYear("Europe/Amsterdam", [["1930-05-15T01:40:27+00:00", "01:59:59", "AMT", -1172 / 60], ["1930-05-15T01:40:28+00:00", "03:00:00", "NST", -4772 / 60], ["1930-10-05T01:40:27+00:00", "02:59:59", "NST", -4772 / 60], ["1930-10-05T01:40:28+00:00", "02:00:00", "AMT", -1172 / 60]]);
        helpers.testYear("Europe/Amsterdam", [["1931-05-15T01:40:27+00:00", "01:59:59", "AMT", -1172 / 60], ["1931-05-15T01:40:28+00:00", "03:00:00", "NST", -4772 / 60], ["1931-10-04T01:40:27+00:00", "02:59:59", "NST", -4772 / 60], ["1931-10-04T01:40:28+00:00", "02:00:00", "AMT", -1172 / 60]]);
        helpers.testYear("Europe/Amsterdam", [["1932-05-22T01:40:27+00:00", "01:59:59", "AMT", -1172 / 60], ["1932-05-22T01:40:28+00:00", "03:00:00", "NST", -4772 / 60], ["1932-10-02T01:40:27+00:00", "02:59:59", "NST", -4772 / 60], ["1932-10-02T01:40:28+00:00", "02:00:00", "AMT", -1172 / 60]]);
        helpers.testYear("Europe/Amsterdam", [["1933-05-15T01:40:27+00:00", "01:59:59", "AMT", -1172 / 60], ["1933-05-15T01:40:28+00:00", "03:00:00", "NST", -4772 / 60], ["1933-10-08T01:40:27+00:00", "02:59:59", "NST", -4772 / 60], ["1933-10-08T01:40:28+00:00", "02:00:00", "AMT", -1172 / 60]]);
        helpers.testYear("Europe/Amsterdam", [["1934-05-15T01:40:27+00:00", "01:59:59", "AMT", -1172 / 60], ["1934-05-15T01:40:28+00:00", "03:00:00", "NST", -4772 / 60], ["1934-10-07T01:40:27+00:00", "02:59:59", "NST", -4772 / 60], ["1934-10-07T01:40:28+00:00", "02:00:00", "AMT", -1172 / 60]]);
        helpers.testYear("Europe/Amsterdam", [["1935-05-15T01:40:27+00:00", "01:59:59", "AMT", -1172 / 60], ["1935-05-15T01:40:28+00:00", "03:00:00", "NST", -4772 / 60], ["1935-10-06T01:40:27+00:00", "02:59:59", "NST", -4772 / 60], ["1935-10-06T01:40:28+00:00", "02:00:00", "AMT", -1172 / 60]]);
        helpers.testYear("Europe/Amsterdam", [["1936-05-15T01:40:27+00:00", "01:59:59", "AMT", -1172 / 60], ["1936-05-15T01:40:28+00:00", "03:00:00", "NST", -4772 / 60], ["1936-10-04T01:40:27+00:00", "02:59:59", "NST", -4772 / 60], ["1936-10-04T01:40:28+00:00", "02:00:00", "AMT", -1172 / 60]]);
        helpers.testYear("Europe/Amsterdam", [["1937-05-22T01:40:27+00:00", "01:59:59", "AMT", -1172 / 60], ["1937-05-22T01:40:28+00:00", "03:00:00", "NST", -4772 / 60], ["1937-06-30T22:40:27+00:00", "23:59:59", "NST", -4772 / 60], ["1937-06-30T22:40:28+00:00", "00:00:28", "+0120", -80], ["1937-10-03T01:39:59+00:00", "02:59:59", "+0120", -80], ["1937-10-03T01:40:00+00:00", "02:00:00", "+0020", -20]]);
        helpers.testYear("Europe/Amsterdam", [["1938-05-15T01:39:59+00:00", "01:59:59", "+0020", -20], ["1938-05-15T01:40:00+00:00", "03:00:00", "+0120", -80], ["1938-10-02T01:39:59+00:00", "02:59:59", "+0120", -80], ["1938-10-02T01:40:00+00:00", "02:00:00", "+0020", -20]]);
        helpers.testYear("Europe/Amsterdam", [["1939-05-15T01:39:59+00:00", "01:59:59", "+0020", -20], ["1939-05-15T01:40:00+00:00", "03:00:00", "+0120", -80], ["1939-10-08T01:39:59+00:00", "02:59:59", "+0120", -80], ["1939-10-08T01:40:00+00:00", "02:00:00", "+0020", -20]]);
        helpers.testYear("Europe/Amsterdam", [["1940-05-15T23:39:59+00:00", "23:59:59", "+0020", -20], ["1940-05-15T23:40:00+00:00", "01:40:00", "CEST", -120]]);
        helpers.testYear("Europe/Amsterdam", [["1942-11-02T00:59:59+00:00", "02:59:59", "CEST", -120], ["1942-11-02T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["1943-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["1943-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["1943-10-04T00:59:59+00:00", "02:59:59", "CEST", -120], ["1943-10-04T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["1944-04-03T00:59:59+00:00", "01:59:59", "CET", -60], ["1944-04-03T01:00:00+00:00", "03:00:00", "CEST", -120], ["1944-10-02T00:59:59+00:00", "02:59:59", "CEST", -120], ["1944-10-02T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["1945-04-02T00:59:59+00:00", "01:59:59", "CET", -60], ["1945-04-02T01:00:00+00:00", "03:00:00", "CEST", -120], ["1945-09-16T00:59:59+00:00", "02:59:59", "CEST", -120], ["1945-09-16T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["1977-04-03T00:59:59+00:00", "01:59:59", "CET", -60], ["1977-04-03T01:00:00+00:00", "03:00:00", "CEST", -120], ["1977-09-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["1977-09-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["1978-04-02T00:59:59+00:00", "01:59:59", "CET", -60], ["1978-04-02T01:00:00+00:00", "03:00:00", "CEST", -120], ["1978-10-01T00:59:59+00:00", "02:59:59", "CEST", -120], ["1978-10-01T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["1979-04-01T00:59:59+00:00", "01:59:59", "CET", -60], ["1979-04-01T01:00:00+00:00", "03:00:00", "CEST", -120], ["1979-09-30T00:59:59+00:00", "02:59:59", "CEST", -120], ["1979-09-30T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["1980-04-06T00:59:59+00:00", "01:59:59", "CET", -60], ["1980-04-06T01:00:00+00:00", "03:00:00", "CEST", -120], ["1980-09-28T00:59:59+00:00", "02:59:59", "CEST", -120], ["1980-09-28T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["1981-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["1981-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["1981-09-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["1981-09-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["1982-03-28T00:59:59+00:00", "01:59:59", "CET", -60], ["1982-03-28T01:00:00+00:00", "03:00:00", "CEST", -120], ["1982-09-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["1982-09-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["1983-03-27T00:59:59+00:00", "01:59:59", "CET", -60], ["1983-03-27T01:00:00+00:00", "03:00:00", "CEST", -120], ["1983-09-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["1983-09-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["1984-03-25T00:59:59+00:00", "01:59:59", "CET", -60], ["1984-03-25T01:00:00+00:00", "03:00:00", "CEST", -120], ["1984-09-30T00:59:59+00:00", "02:59:59", "CEST", -120], ["1984-09-30T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["1985-03-31T00:59:59+00:00", "01:59:59", "CET", -60], ["1985-03-31T01:00:00+00:00", "03:00:00", "CEST", -120], ["1985-09-29T00:59:59+00:00", "02:59:59", "CEST", -120], ["1985-09-29T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["1986-03-30T00:59:59+00:00", "01:59:59", "CET", -60], ["1986-03-30T01:00:00+00:00", "03:00:00", "CEST", -120], ["1986-09-28T00:59:59+00:00", "02:59:59", "CEST", -120], ["1986-09-28T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["1987-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["1987-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["1987-09-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["1987-09-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["1988-03-27T00:59:59+00:00", "01:59:59", "CET", -60], ["1988-03-27T01:00:00+00:00", "03:00:00", "CEST", -120], ["1988-09-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["1988-09-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["1989-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["1989-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["1989-09-24T00:59:59+00:00", "02:59:59", "CEST", -120], ["1989-09-24T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["1990-03-25T00:59:59+00:00", "01:59:59", "CET", -60], ["1990-03-25T01:00:00+00:00", "03:00:00", "CEST", -120], ["1990-09-30T00:59:59+00:00", "02:59:59", "CEST", -120], ["1990-09-30T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["1991-03-31T00:59:59+00:00", "01:59:59", "CET", -60], ["1991-03-31T01:00:00+00:00", "03:00:00", "CEST", -120], ["1991-09-29T00:59:59+00:00", "02:59:59", "CEST", -120], ["1991-09-29T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["1992-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["1992-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["1992-09-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["1992-09-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["1993-03-28T00:59:59+00:00", "01:59:59", "CET", -60], ["1993-03-28T01:00:00+00:00", "03:00:00", "CEST", -120], ["1993-09-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["1993-09-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["1994-03-27T00:59:59+00:00", "01:59:59", "CET", -60], ["1994-03-27T01:00:00+00:00", "03:00:00", "CEST", -120], ["1994-09-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["1994-09-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["1995-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["1995-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["1995-09-24T00:59:59+00:00", "02:59:59", "CEST", -120], ["1995-09-24T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["1996-03-31T00:59:59+00:00", "01:59:59", "CET", -60], ["1996-03-31T01:00:00+00:00", "03:00:00", "CEST", -120], ["1996-10-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["1996-10-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["1997-03-30T00:59:59+00:00", "01:59:59", "CET", -60], ["1997-03-30T01:00:00+00:00", "03:00:00", "CEST", -120], ["1997-10-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["1997-10-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["1998-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["1998-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["1998-10-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["1998-10-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["1999-03-28T00:59:59+00:00", "01:59:59", "CET", -60], ["1999-03-28T01:00:00+00:00", "03:00:00", "CEST", -120], ["1999-10-31T00:59:59+00:00", "02:59:59", "CEST", -120], ["1999-10-31T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2000-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["2000-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["2000-10-29T00:59:59+00:00", "02:59:59", "CEST", -120], ["2000-10-29T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2001-03-25T00:59:59+00:00", "01:59:59", "CET", -60], ["2001-03-25T01:00:00+00:00", "03:00:00", "CEST", -120], ["2001-10-28T00:59:59+00:00", "02:59:59", "CEST", -120], ["2001-10-28T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2002-03-31T00:59:59+00:00", "01:59:59", "CET", -60], ["2002-03-31T01:00:00+00:00", "03:00:00", "CEST", -120], ["2002-10-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["2002-10-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2003-03-30T00:59:59+00:00", "01:59:59", "CET", -60], ["2003-03-30T01:00:00+00:00", "03:00:00", "CEST", -120], ["2003-10-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["2003-10-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2004-03-28T00:59:59+00:00", "01:59:59", "CET", -60], ["2004-03-28T01:00:00+00:00", "03:00:00", "CEST", -120], ["2004-10-31T00:59:59+00:00", "02:59:59", "CEST", -120], ["2004-10-31T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2005-03-27T00:59:59+00:00", "01:59:59", "CET", -60], ["2005-03-27T01:00:00+00:00", "03:00:00", "CEST", -120], ["2005-10-30T00:59:59+00:00", "02:59:59", "CEST", -120], ["2005-10-30T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2006-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["2006-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["2006-10-29T00:59:59+00:00", "02:59:59", "CEST", -120], ["2006-10-29T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2007-03-25T00:59:59+00:00", "01:59:59", "CET", -60], ["2007-03-25T01:00:00+00:00", "03:00:00", "CEST", -120], ["2007-10-28T00:59:59+00:00", "02:59:59", "CEST", -120], ["2007-10-28T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2008-03-30T00:59:59+00:00", "01:59:59", "CET", -60], ["2008-03-30T01:00:00+00:00", "03:00:00", "CEST", -120], ["2008-10-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["2008-10-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2009-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["2009-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["2009-10-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["2009-10-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2010-03-28T00:59:59+00:00", "01:59:59", "CET", -60], ["2010-03-28T01:00:00+00:00", "03:00:00", "CEST", -120], ["2010-10-31T00:59:59+00:00", "02:59:59", "CEST", -120], ["2010-10-31T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2011-03-27T00:59:59+00:00", "01:59:59", "CET", -60], ["2011-03-27T01:00:00+00:00", "03:00:00", "CEST", -120], ["2011-10-30T00:59:59+00:00", "02:59:59", "CEST", -120], ["2011-10-30T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2012-03-25T00:59:59+00:00", "01:59:59", "CET", -60], ["2012-03-25T01:00:00+00:00", "03:00:00", "CEST", -120], ["2012-10-28T00:59:59+00:00", "02:59:59", "CEST", -120], ["2012-10-28T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2013-03-31T00:59:59+00:00", "01:59:59", "CET", -60], ["2013-03-31T01:00:00+00:00", "03:00:00", "CEST", -120], ["2013-10-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["2013-10-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2014-03-30T00:59:59+00:00", "01:59:59", "CET", -60], ["2014-03-30T01:00:00+00:00", "03:00:00", "CEST", -120], ["2014-10-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["2014-10-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2015-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["2015-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["2015-10-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["2015-10-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2016-03-27T00:59:59+00:00", "01:59:59", "CET", -60], ["2016-03-27T01:00:00+00:00", "03:00:00", "CEST", -120], ["2016-10-30T00:59:59+00:00", "02:59:59", "CEST", -120], ["2016-10-30T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2017-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["2017-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["2017-10-29T00:59:59+00:00", "02:59:59", "CEST", -120], ["2017-10-29T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2018-03-25T00:59:59+00:00", "01:59:59", "CET", -60], ["2018-03-25T01:00:00+00:00", "03:00:00", "CEST", -120], ["2018-10-28T00:59:59+00:00", "02:59:59", "CEST", -120], ["2018-10-28T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2019-03-31T00:59:59+00:00", "01:59:59", "CET", -60], ["2019-03-31T01:00:00+00:00", "03:00:00", "CEST", -120], ["2019-10-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["2019-10-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2020-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["2020-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["2020-10-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["2020-10-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2021-03-28T00:59:59+00:00", "01:59:59", "CET", -60], ["2021-03-28T01:00:00+00:00", "03:00:00", "CEST", -120], ["2021-10-31T00:59:59+00:00", "02:59:59", "CEST", -120], ["2021-10-31T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2022-03-27T00:59:59+00:00", "01:59:59", "CET", -60], ["2022-03-27T01:00:00+00:00", "03:00:00", "CEST", -120], ["2022-10-30T00:59:59+00:00", "02:59:59", "CEST", -120], ["2022-10-30T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2023-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["2023-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["2023-10-29T00:59:59+00:00", "02:59:59", "CEST", -120], ["2023-10-29T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2024-03-31T00:59:59+00:00", "01:59:59", "CET", -60], ["2024-03-31T01:00:00+00:00", "03:00:00", "CEST", -120], ["2024-10-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["2024-10-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2025-03-30T00:59:59+00:00", "01:59:59", "CET", -60], ["2025-03-30T01:00:00+00:00", "03:00:00", "CEST", -120], ["2025-10-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["2025-10-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2026-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["2026-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["2026-10-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["2026-10-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2027-03-28T00:59:59+00:00", "01:59:59", "CET", -60], ["2027-03-28T01:00:00+00:00", "03:00:00", "CEST", -120], ["2027-10-31T00:59:59+00:00", "02:59:59", "CEST", -120], ["2027-10-31T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2028-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["2028-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["2028-10-29T00:59:59+00:00", "02:59:59", "CEST", -120], ["2028-10-29T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2029-03-25T00:59:59+00:00", "01:59:59", "CET", -60], ["2029-03-25T01:00:00+00:00", "03:00:00", "CEST", -120], ["2029-10-28T00:59:59+00:00", "02:59:59", "CEST", -120], ["2029-10-28T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2030-03-31T00:59:59+00:00", "01:59:59", "CET", -60], ["2030-03-31T01:00:00+00:00", "03:00:00", "CEST", -120], ["2030-10-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["2030-10-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2031-03-30T00:59:59+00:00", "01:59:59", "CET", -60], ["2031-03-30T01:00:00+00:00", "03:00:00", "CEST", -120], ["2031-10-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["2031-10-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2032-03-28T00:59:59+00:00", "01:59:59", "CET", -60], ["2032-03-28T01:00:00+00:00", "03:00:00", "CEST", -120], ["2032-10-31T00:59:59+00:00", "02:59:59", "CEST", -120], ["2032-10-31T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2033-03-27T00:59:59+00:00", "01:59:59", "CET", -60], ["2033-03-27T01:00:00+00:00", "03:00:00", "CEST", -120], ["2033-10-30T00:59:59+00:00", "02:59:59", "CEST", -120], ["2033-10-30T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2034-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["2034-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["2034-10-29T00:59:59+00:00", "02:59:59", "CEST", -120], ["2034-10-29T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2035-03-25T00:59:59+00:00", "01:59:59", "CET", -60], ["2035-03-25T01:00:00+00:00", "03:00:00", "CEST", -120], ["2035-10-28T00:59:59+00:00", "02:59:59", "CEST", -120], ["2035-10-28T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2036-03-30T00:59:59+00:00", "01:59:59", "CET", -60], ["2036-03-30T01:00:00+00:00", "03:00:00", "CEST", -120], ["2036-10-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["2036-10-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Amsterdam", [["2037-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["2037-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["2037-10-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["2037-10-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
    });
});
