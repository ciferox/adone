

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Europe/Istanbul", () => {
        helpers.testGuess("Europe/Istanbul", {
            offset: true,
            abbr: true
        });
        helpers.testYear("Europe/Istanbul", [["1910-09-30T22:03:03+00:00", "23:59:59", "IMT", -7016 / 60], ["1910-09-30T22:03:04+00:00", "00:03:04", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1916-04-30T21:59:59+00:00", "23:59:59", "EET", -120], ["1916-04-30T22:00:00+00:00", "01:00:00", "EEST", -180], ["1916-09-30T20:59:59+00:00", "23:59:59", "EEST", -180], ["1916-09-30T21:00:00+00:00", "23:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1920-03-27T21:59:59+00:00", "23:59:59", "EET", -120], ["1920-03-27T22:00:00+00:00", "01:00:00", "EEST", -180], ["1920-10-24T20:59:59+00:00", "23:59:59", "EEST", -180], ["1920-10-24T21:00:00+00:00", "23:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1921-04-02T21:59:59+00:00", "23:59:59", "EET", -120], ["1921-04-02T22:00:00+00:00", "01:00:00", "EEST", -180], ["1921-10-02T20:59:59+00:00", "23:59:59", "EEST", -180], ["1921-10-02T21:00:00+00:00", "23:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1922-03-25T21:59:59+00:00", "23:59:59", "EET", -120], ["1922-03-25T22:00:00+00:00", "01:00:00", "EEST", -180], ["1922-10-07T20:59:59+00:00", "23:59:59", "EEST", -180], ["1922-10-07T21:00:00+00:00", "23:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1924-05-12T21:59:59+00:00", "23:59:59", "EET", -120], ["1924-05-12T22:00:00+00:00", "01:00:00", "EEST", -180], ["1924-09-30T20:59:59+00:00", "23:59:59", "EEST", -180], ["1924-09-30T21:00:00+00:00", "23:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1925-04-30T21:59:59+00:00", "23:59:59", "EET", -120], ["1925-04-30T22:00:00+00:00", "01:00:00", "EEST", -180], ["1925-09-30T20:59:59+00:00", "23:59:59", "EEST", -180], ["1925-09-30T21:00:00+00:00", "23:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1940-06-29T21:59:59+00:00", "23:59:59", "EET", -120], ["1940-06-29T22:00:00+00:00", "01:00:00", "EEST", -180], ["1940-10-04T20:59:59+00:00", "23:59:59", "EEST", -180], ["1940-10-04T21:00:00+00:00", "23:00:00", "EET", -120], ["1940-11-30T21:59:59+00:00", "23:59:59", "EET", -120], ["1940-11-30T22:00:00+00:00", "01:00:00", "EEST", -180]]);
        helpers.testYear("Europe/Istanbul", [["1941-09-20T20:59:59+00:00", "23:59:59", "EEST", -180], ["1941-09-20T21:00:00+00:00", "23:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1942-03-31T21:59:59+00:00", "23:59:59", "EET", -120], ["1942-03-31T22:00:00+00:00", "01:00:00", "EEST", -180], ["1942-10-31T20:59:59+00:00", "23:59:59", "EEST", -180], ["1942-10-31T21:00:00+00:00", "23:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1945-04-01T21:59:59+00:00", "23:59:59", "EET", -120], ["1945-04-01T22:00:00+00:00", "01:00:00", "EEST", -180], ["1945-10-07T20:59:59+00:00", "23:59:59", "EEST", -180], ["1945-10-07T21:00:00+00:00", "23:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1946-05-31T21:59:59+00:00", "23:59:59", "EET", -120], ["1946-05-31T22:00:00+00:00", "01:00:00", "EEST", -180], ["1946-09-30T20:59:59+00:00", "23:59:59", "EEST", -180], ["1946-09-30T21:00:00+00:00", "23:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1947-04-19T21:59:59+00:00", "23:59:59", "EET", -120], ["1947-04-19T22:00:00+00:00", "01:00:00", "EEST", -180], ["1947-10-04T20:59:59+00:00", "23:59:59", "EEST", -180], ["1947-10-04T21:00:00+00:00", "23:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1948-04-17T21:59:59+00:00", "23:59:59", "EET", -120], ["1948-04-17T22:00:00+00:00", "01:00:00", "EEST", -180], ["1948-10-02T20:59:59+00:00", "23:59:59", "EEST", -180], ["1948-10-02T21:00:00+00:00", "23:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1949-04-09T21:59:59+00:00", "23:59:59", "EET", -120], ["1949-04-09T22:00:00+00:00", "01:00:00", "EEST", -180], ["1949-10-01T20:59:59+00:00", "23:59:59", "EEST", -180], ["1949-10-01T21:00:00+00:00", "23:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1950-04-18T21:59:59+00:00", "23:59:59", "EET", -120], ["1950-04-18T22:00:00+00:00", "01:00:00", "EEST", -180], ["1950-10-07T20:59:59+00:00", "23:59:59", "EEST", -180], ["1950-10-07T21:00:00+00:00", "23:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1951-04-21T21:59:59+00:00", "23:59:59", "EET", -120], ["1951-04-21T22:00:00+00:00", "01:00:00", "EEST", -180], ["1951-10-07T20:59:59+00:00", "23:59:59", "EEST", -180], ["1951-10-07T21:00:00+00:00", "23:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1962-07-14T21:59:59+00:00", "23:59:59", "EET", -120], ["1962-07-14T22:00:00+00:00", "01:00:00", "EEST", -180], ["1962-10-07T20:59:59+00:00", "23:59:59", "EEST", -180], ["1962-10-07T21:00:00+00:00", "23:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1964-05-14T21:59:59+00:00", "23:59:59", "EET", -120], ["1964-05-14T22:00:00+00:00", "01:00:00", "EEST", -180], ["1964-09-30T20:59:59+00:00", "23:59:59", "EEST", -180], ["1964-09-30T21:00:00+00:00", "23:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1970-05-02T21:59:59+00:00", "23:59:59", "EET", -120], ["1970-05-02T22:00:00+00:00", "01:00:00", "EEST", -180], ["1970-10-03T20:59:59+00:00", "23:59:59", "EEST", -180], ["1970-10-03T21:00:00+00:00", "23:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1971-05-01T21:59:59+00:00", "23:59:59", "EET", -120], ["1971-05-01T22:00:00+00:00", "01:00:00", "EEST", -180], ["1971-10-02T20:59:59+00:00", "23:59:59", "EEST", -180], ["1971-10-02T21:00:00+00:00", "23:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1972-05-06T21:59:59+00:00", "23:59:59", "EET", -120], ["1972-05-06T22:00:00+00:00", "01:00:00", "EEST", -180], ["1972-10-07T20:59:59+00:00", "23:59:59", "EEST", -180], ["1972-10-07T21:00:00+00:00", "23:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1973-06-02T22:59:59+00:00", "00:59:59", "EET", -120], ["1973-06-02T23:00:00+00:00", "02:00:00", "EEST", -180], ["1973-11-03T23:59:59+00:00", "02:59:59", "EEST", -180], ["1973-11-04T00:00:00+00:00", "02:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1974-03-30T23:59:59+00:00", "01:59:59", "EET", -120], ["1974-03-31T00:00:00+00:00", "03:00:00", "EEST", -180], ["1974-11-03T01:59:59+00:00", "04:59:59", "EEST", -180], ["1974-11-03T02:00:00+00:00", "04:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1975-03-29T21:59:59+00:00", "23:59:59", "EET", -120], ["1975-03-29T22:00:00+00:00", "01:00:00", "EEST", -180], ["1975-10-25T20:59:59+00:00", "23:59:59", "EEST", -180], ["1975-10-25T21:00:00+00:00", "23:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1976-05-31T21:59:59+00:00", "23:59:59", "EET", -120], ["1976-05-31T22:00:00+00:00", "01:00:00", "EEST", -180], ["1976-10-30T20:59:59+00:00", "23:59:59", "EEST", -180], ["1976-10-30T21:00:00+00:00", "23:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1977-04-02T21:59:59+00:00", "23:59:59", "EET", -120], ["1977-04-02T22:00:00+00:00", "01:00:00", "EEST", -180], ["1977-10-15T20:59:59+00:00", "23:59:59", "EEST", -180], ["1977-10-15T21:00:00+00:00", "23:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1978-04-01T21:59:59+00:00", "23:59:59", "EET", -120], ["1978-04-01T22:00:00+00:00", "01:00:00", "EEST", -180], ["1978-10-14T20:59:59+00:00", "23:59:59", "EEST", -180], ["1978-10-14T21:00:00+00:00", "01:00:00", "+04", -240]]);
        helpers.testYear("Europe/Istanbul", [["1979-10-14T19:59:59+00:00", "23:59:59", "+04", -240], ["1979-10-14T20:00:00+00:00", "23:00:00", "+03", -180]]);
        helpers.testYear("Europe/Istanbul", [["1980-04-05T23:59:59+00:00", "02:59:59", "+03", -180], ["1980-04-06T00:00:00+00:00", "04:00:00", "+04", -240], ["1980-10-12T19:59:59+00:00", "23:59:59", "+04", -240], ["1980-10-12T20:00:00+00:00", "23:00:00", "+03", -180]]);
        helpers.testYear("Europe/Istanbul", [["1981-03-28T23:59:59+00:00", "02:59:59", "+03", -180], ["1981-03-29T00:00:00+00:00", "04:00:00", "+04", -240], ["1981-10-11T19:59:59+00:00", "23:59:59", "+04", -240], ["1981-10-11T20:00:00+00:00", "23:00:00", "+03", -180]]);
        helpers.testYear("Europe/Istanbul", [["1982-03-27T23:59:59+00:00", "02:59:59", "+03", -180], ["1982-03-28T00:00:00+00:00", "04:00:00", "+04", -240], ["1982-10-10T19:59:59+00:00", "23:59:59", "+04", -240], ["1982-10-10T20:00:00+00:00", "23:00:00", "+03", -180]]);
        helpers.testYear("Europe/Istanbul", [["1983-07-30T20:59:59+00:00", "23:59:59", "+03", -180], ["1983-07-30T21:00:00+00:00", "01:00:00", "+04", -240], ["1983-10-01T19:59:59+00:00", "23:59:59", "+04", -240], ["1983-10-01T20:00:00+00:00", "23:00:00", "+03", -180]]);
        helpers.testYear("Europe/Istanbul", [["1985-04-19T20:59:59+00:00", "23:59:59", "+03", -180], ["1985-04-19T21:00:00+00:00", "00:00:00", "EEST", -180], ["1985-09-27T20:59:59+00:00", "23:59:59", "EEST", -180], ["1985-09-27T21:00:00+00:00", "23:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1986-03-29T22:59:59+00:00", "00:59:59", "EET", -120], ["1986-03-29T23:00:00+00:00", "02:00:00", "EEST", -180], ["1986-09-27T22:59:59+00:00", "01:59:59", "EEST", -180], ["1986-09-27T23:00:00+00:00", "01:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1987-03-28T22:59:59+00:00", "00:59:59", "EET", -120], ["1987-03-28T23:00:00+00:00", "02:00:00", "EEST", -180], ["1987-09-26T22:59:59+00:00", "01:59:59", "EEST", -180], ["1987-09-26T23:00:00+00:00", "01:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1988-03-26T22:59:59+00:00", "00:59:59", "EET", -120], ["1988-03-26T23:00:00+00:00", "02:00:00", "EEST", -180], ["1988-09-24T22:59:59+00:00", "01:59:59", "EEST", -180], ["1988-09-24T23:00:00+00:00", "01:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1989-03-25T22:59:59+00:00", "00:59:59", "EET", -120], ["1989-03-25T23:00:00+00:00", "02:00:00", "EEST", -180], ["1989-09-23T22:59:59+00:00", "01:59:59", "EEST", -180], ["1989-09-23T23:00:00+00:00", "01:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1990-03-24T22:59:59+00:00", "00:59:59", "EET", -120], ["1990-03-24T23:00:00+00:00", "02:00:00", "EEST", -180], ["1990-09-29T22:59:59+00:00", "01:59:59", "EEST", -180], ["1990-09-29T23:00:00+00:00", "01:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1991-03-30T22:59:59+00:00", "00:59:59", "EET", -120], ["1991-03-30T23:00:00+00:00", "02:00:00", "EEST", -180], ["1991-09-28T22:59:59+00:00", "01:59:59", "EEST", -180], ["1991-09-28T23:00:00+00:00", "01:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1992-03-28T22:59:59+00:00", "00:59:59", "EET", -120], ["1992-03-28T23:00:00+00:00", "02:00:00", "EEST", -180], ["1992-09-26T22:59:59+00:00", "01:59:59", "EEST", -180], ["1992-09-26T23:00:00+00:00", "01:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1993-03-27T22:59:59+00:00", "00:59:59", "EET", -120], ["1993-03-27T23:00:00+00:00", "02:00:00", "EEST", -180], ["1993-09-25T22:59:59+00:00", "01:59:59", "EEST", -180], ["1993-09-25T23:00:00+00:00", "01:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1994-03-19T22:59:59+00:00", "00:59:59", "EET", -120], ["1994-03-19T23:00:00+00:00", "02:00:00", "EEST", -180], ["1994-09-24T22:59:59+00:00", "01:59:59", "EEST", -180], ["1994-09-24T23:00:00+00:00", "01:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1995-03-25T22:59:59+00:00", "00:59:59", "EET", -120], ["1995-03-25T23:00:00+00:00", "02:00:00", "EEST", -180], ["1995-09-23T22:59:59+00:00", "01:59:59", "EEST", -180], ["1995-09-23T23:00:00+00:00", "01:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1996-03-30T22:59:59+00:00", "00:59:59", "EET", -120], ["1996-03-30T23:00:00+00:00", "02:00:00", "EEST", -180], ["1996-10-26T22:59:59+00:00", "01:59:59", "EEST", -180], ["1996-10-26T23:00:00+00:00", "01:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1997-03-29T22:59:59+00:00", "00:59:59", "EET", -120], ["1997-03-29T23:00:00+00:00", "02:00:00", "EEST", -180], ["1997-10-25T22:59:59+00:00", "01:59:59", "EEST", -180], ["1997-10-25T23:00:00+00:00", "01:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1998-03-28T22:59:59+00:00", "00:59:59", "EET", -120], ["1998-03-28T23:00:00+00:00", "02:00:00", "EEST", -180], ["1998-10-24T22:59:59+00:00", "01:59:59", "EEST", -180], ["1998-10-24T23:00:00+00:00", "01:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["1999-03-27T22:59:59+00:00", "00:59:59", "EET", -120], ["1999-03-27T23:00:00+00:00", "02:00:00", "EEST", -180], ["1999-10-30T22:59:59+00:00", "01:59:59", "EEST", -180], ["1999-10-30T23:00:00+00:00", "01:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["2000-03-25T22:59:59+00:00", "00:59:59", "EET", -120], ["2000-03-25T23:00:00+00:00", "02:00:00", "EEST", -180], ["2000-10-28T22:59:59+00:00", "01:59:59", "EEST", -180], ["2000-10-28T23:00:00+00:00", "01:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["2001-03-24T22:59:59+00:00", "00:59:59", "EET", -120], ["2001-03-24T23:00:00+00:00", "02:00:00", "EEST", -180], ["2001-10-27T22:59:59+00:00", "01:59:59", "EEST", -180], ["2001-10-27T23:00:00+00:00", "01:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["2002-03-30T22:59:59+00:00", "00:59:59", "EET", -120], ["2002-03-30T23:00:00+00:00", "02:00:00", "EEST", -180], ["2002-10-26T22:59:59+00:00", "01:59:59", "EEST", -180], ["2002-10-26T23:00:00+00:00", "01:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["2003-03-29T22:59:59+00:00", "00:59:59", "EET", -120], ["2003-03-29T23:00:00+00:00", "02:00:00", "EEST", -180], ["2003-10-25T22:59:59+00:00", "01:59:59", "EEST", -180], ["2003-10-25T23:00:00+00:00", "01:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["2004-03-27T22:59:59+00:00", "00:59:59", "EET", -120], ["2004-03-27T23:00:00+00:00", "02:00:00", "EEST", -180], ["2004-10-30T22:59:59+00:00", "01:59:59", "EEST", -180], ["2004-10-30T23:00:00+00:00", "01:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["2005-03-26T22:59:59+00:00", "00:59:59", "EET", -120], ["2005-03-26T23:00:00+00:00", "02:00:00", "EEST", -180], ["2005-10-29T22:59:59+00:00", "01:59:59", "EEST", -180], ["2005-10-29T23:00:00+00:00", "01:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["2006-03-25T22:59:59+00:00", "00:59:59", "EET", -120], ["2006-03-25T23:00:00+00:00", "02:00:00", "EEST", -180], ["2006-10-28T22:59:59+00:00", "01:59:59", "EEST", -180], ["2006-10-28T23:00:00+00:00", "01:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["2007-03-25T00:59:59+00:00", "02:59:59", "EET", -120], ["2007-03-25T01:00:00+00:00", "04:00:00", "EEST", -180], ["2007-10-28T00:59:59+00:00", "03:59:59", "EEST", -180], ["2007-10-28T01:00:00+00:00", "03:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["2008-03-30T00:59:59+00:00", "02:59:59", "EET", -120], ["2008-03-30T01:00:00+00:00", "04:00:00", "EEST", -180], ["2008-10-26T00:59:59+00:00", "03:59:59", "EEST", -180], ["2008-10-26T01:00:00+00:00", "03:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["2009-03-29T00:59:59+00:00", "02:59:59", "EET", -120], ["2009-03-29T01:00:00+00:00", "04:00:00", "EEST", -180], ["2009-10-25T00:59:59+00:00", "03:59:59", "EEST", -180], ["2009-10-25T01:00:00+00:00", "03:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["2010-03-28T00:59:59+00:00", "02:59:59", "EET", -120], ["2010-03-28T01:00:00+00:00", "04:00:00", "EEST", -180], ["2010-10-31T00:59:59+00:00", "03:59:59", "EEST", -180], ["2010-10-31T01:00:00+00:00", "03:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["2011-03-28T00:59:59+00:00", "02:59:59", "EET", -120], ["2011-03-28T01:00:00+00:00", "04:00:00", "EEST", -180], ["2011-10-30T00:59:59+00:00", "03:59:59", "EEST", -180], ["2011-10-30T01:00:00+00:00", "03:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["2012-03-25T00:59:59+00:00", "02:59:59", "EET", -120], ["2012-03-25T01:00:00+00:00", "04:00:00", "EEST", -180], ["2012-10-28T00:59:59+00:00", "03:59:59", "EEST", -180], ["2012-10-28T01:00:00+00:00", "03:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["2013-03-31T00:59:59+00:00", "02:59:59", "EET", -120], ["2013-03-31T01:00:00+00:00", "04:00:00", "EEST", -180], ["2013-10-27T00:59:59+00:00", "03:59:59", "EEST", -180], ["2013-10-27T01:00:00+00:00", "03:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["2014-03-31T00:59:59+00:00", "02:59:59", "EET", -120], ["2014-03-31T01:00:00+00:00", "04:00:00", "EEST", -180], ["2014-10-26T00:59:59+00:00", "03:59:59", "EEST", -180], ["2014-10-26T01:00:00+00:00", "03:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["2015-03-29T00:59:59+00:00", "02:59:59", "EET", -120], ["2015-03-29T01:00:00+00:00", "04:00:00", "EEST", -180], ["2015-11-08T00:59:59+00:00", "03:59:59", "EEST", -180], ["2015-11-08T01:00:00+00:00", "03:00:00", "EET", -120]]);
        helpers.testYear("Europe/Istanbul", [["2016-03-27T00:59:59+00:00", "02:59:59", "EET", -120], ["2016-03-27T01:00:00+00:00", "04:00:00", "EEST", -180], ["2016-09-06T20:59:59+00:00", "23:59:59", "EEST", -180], ["2016-09-06T21:00:00+00:00", "00:00:00", "+03", -180]]);
    });
});
