

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Europe/Warsaw", () => {
        helpers.testYear("Europe/Warsaw", [["1915-08-04T22:35:59+00:00", "23:59:59", "WMT", -84], ["1915-08-04T22:36:00+00:00", "23:36:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1916-04-30T21:59:59+00:00", "22:59:59", "CET", -60], ["1916-04-30T22:00:00+00:00", "00:00:00", "CEST", -120], ["1916-09-30T22:59:59+00:00", "00:59:59", "CEST", -120], ["1916-09-30T23:00:00+00:00", "00:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1917-04-16T00:59:59+00:00", "01:59:59", "CET", -60], ["1917-04-16T01:00:00+00:00", "03:00:00", "CEST", -120], ["1917-09-17T00:59:59+00:00", "02:59:59", "CEST", -120], ["1917-09-17T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1918-04-15T00:59:59+00:00", "01:59:59", "CET", -60], ["1918-04-15T01:00:00+00:00", "03:00:00", "CEST", -120], ["1918-09-16T00:59:59+00:00", "02:59:59", "CEST", -120], ["1918-09-16T01:00:00+00:00", "03:00:00", "EET", -120]]);
        helpers.testYear("Europe/Warsaw", [["1919-04-14T23:59:59+00:00", "01:59:59", "EET", -120], ["1919-04-15T00:00:00+00:00", "03:00:00", "EEST", -180], ["1919-09-15T23:59:59+00:00", "02:59:59", "EEST", -180], ["1919-09-16T00:00:00+00:00", "02:00:00", "EET", -120]]);
        helpers.testYear("Europe/Warsaw", [["1922-05-31T21:59:59+00:00", "23:59:59", "EET", -120], ["1922-05-31T22:00:00+00:00", "23:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1940-06-23T00:59:59+00:00", "01:59:59", "CET", -60], ["1940-06-23T01:00:00+00:00", "03:00:00", "CEST", -120]]);
        helpers.testYear("Europe/Warsaw", [["1942-11-02T00:59:59+00:00", "02:59:59", "CEST", -120], ["1942-11-02T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1943-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["1943-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["1943-10-04T00:59:59+00:00", "02:59:59", "CEST", -120], ["1943-10-04T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1944-04-03T00:59:59+00:00", "01:59:59", "CET", -60], ["1944-04-03T01:00:00+00:00", "03:00:00", "CEST", -120], ["1944-10-03T23:59:59+00:00", "01:59:59", "CEST", -120], ["1944-10-04T00:00:00+00:00", "01:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1945-04-28T22:59:59+00:00", "23:59:59", "CET", -60], ["1945-04-28T23:00:00+00:00", "01:00:00", "CEST", -120], ["1945-10-31T21:59:59+00:00", "23:59:59", "CEST", -120], ["1945-10-31T22:00:00+00:00", "23:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1946-04-13T22:59:59+00:00", "23:59:59", "CET", -60], ["1946-04-13T23:00:00+00:00", "01:00:00", "CEST", -120], ["1946-10-07T00:59:59+00:00", "02:59:59", "CEST", -120], ["1946-10-07T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1947-05-04T00:59:59+00:00", "01:59:59", "CET", -60], ["1947-05-04T01:00:00+00:00", "03:00:00", "CEST", -120], ["1947-10-05T00:59:59+00:00", "02:59:59", "CEST", -120], ["1947-10-05T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1948-04-18T00:59:59+00:00", "01:59:59", "CET", -60], ["1948-04-18T01:00:00+00:00", "03:00:00", "CEST", -120], ["1948-10-03T00:59:59+00:00", "02:59:59", "CEST", -120], ["1948-10-03T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1949-04-10T00:59:59+00:00", "01:59:59", "CET", -60], ["1949-04-10T01:00:00+00:00", "03:00:00", "CEST", -120], ["1949-10-02T00:59:59+00:00", "02:59:59", "CEST", -120], ["1949-10-02T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1957-06-01T23:59:59+00:00", "00:59:59", "CET", -60], ["1957-06-02T00:00:00+00:00", "02:00:00", "CEST", -120], ["1957-09-28T23:59:59+00:00", "01:59:59", "CEST", -120], ["1957-09-29T00:00:00+00:00", "01:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1958-03-29T23:59:59+00:00", "00:59:59", "CET", -60], ["1958-03-30T00:00:00+00:00", "02:00:00", "CEST", -120], ["1958-09-27T23:59:59+00:00", "01:59:59", "CEST", -120], ["1958-09-28T00:00:00+00:00", "01:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1959-05-30T23:59:59+00:00", "00:59:59", "CET", -60], ["1959-05-31T00:00:00+00:00", "02:00:00", "CEST", -120], ["1959-10-03T23:59:59+00:00", "01:59:59", "CEST", -120], ["1959-10-04T00:00:00+00:00", "01:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1960-04-02T23:59:59+00:00", "00:59:59", "CET", -60], ["1960-04-03T00:00:00+00:00", "02:00:00", "CEST", -120], ["1960-10-01T23:59:59+00:00", "01:59:59", "CEST", -120], ["1960-10-02T00:00:00+00:00", "01:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1961-05-27T23:59:59+00:00", "00:59:59", "CET", -60], ["1961-05-28T00:00:00+00:00", "02:00:00", "CEST", -120], ["1961-09-30T23:59:59+00:00", "01:59:59", "CEST", -120], ["1961-10-01T00:00:00+00:00", "01:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1962-05-26T23:59:59+00:00", "00:59:59", "CET", -60], ["1962-05-27T00:00:00+00:00", "02:00:00", "CEST", -120], ["1962-09-29T23:59:59+00:00", "01:59:59", "CEST", -120], ["1962-09-30T00:00:00+00:00", "01:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1963-05-25T23:59:59+00:00", "00:59:59", "CET", -60], ["1963-05-26T00:00:00+00:00", "02:00:00", "CEST", -120], ["1963-09-28T23:59:59+00:00", "01:59:59", "CEST", -120], ["1963-09-29T00:00:00+00:00", "01:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1964-05-30T23:59:59+00:00", "00:59:59", "CET", -60], ["1964-05-31T00:00:00+00:00", "02:00:00", "CEST", -120], ["1964-09-26T23:59:59+00:00", "01:59:59", "CEST", -120], ["1964-09-27T00:00:00+00:00", "01:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1977-04-02T23:59:59+00:00", "00:59:59", "CET", -60], ["1977-04-03T00:00:00+00:00", "02:00:00", "CEST", -120], ["1977-09-24T23:59:59+00:00", "01:59:59", "CEST", -120], ["1977-09-25T00:00:00+00:00", "01:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1978-04-01T23:59:59+00:00", "00:59:59", "CET", -60], ["1978-04-02T00:00:00+00:00", "02:00:00", "CEST", -120], ["1978-09-30T23:59:59+00:00", "01:59:59", "CEST", -120], ["1978-10-01T00:00:00+00:00", "01:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1979-03-31T23:59:59+00:00", "00:59:59", "CET", -60], ["1979-04-01T00:00:00+00:00", "02:00:00", "CEST", -120], ["1979-09-29T23:59:59+00:00", "01:59:59", "CEST", -120], ["1979-09-30T00:00:00+00:00", "01:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1980-04-05T23:59:59+00:00", "00:59:59", "CET", -60], ["1980-04-06T00:00:00+00:00", "02:00:00", "CEST", -120], ["1980-09-27T23:59:59+00:00", "01:59:59", "CEST", -120], ["1980-09-28T00:00:00+00:00", "01:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1981-03-28T23:59:59+00:00", "00:59:59", "CET", -60], ["1981-03-29T00:00:00+00:00", "02:00:00", "CEST", -120], ["1981-09-26T23:59:59+00:00", "01:59:59", "CEST", -120], ["1981-09-27T00:00:00+00:00", "01:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1982-03-27T23:59:59+00:00", "00:59:59", "CET", -60], ["1982-03-28T00:00:00+00:00", "02:00:00", "CEST", -120], ["1982-09-25T23:59:59+00:00", "01:59:59", "CEST", -120], ["1982-09-26T00:00:00+00:00", "01:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1983-03-26T23:59:59+00:00", "00:59:59", "CET", -60], ["1983-03-27T00:00:00+00:00", "02:00:00", "CEST", -120], ["1983-09-24T23:59:59+00:00", "01:59:59", "CEST", -120], ["1983-09-25T00:00:00+00:00", "01:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1984-03-24T23:59:59+00:00", "00:59:59", "CET", -60], ["1984-03-25T00:00:00+00:00", "02:00:00", "CEST", -120], ["1984-09-29T23:59:59+00:00", "01:59:59", "CEST", -120], ["1984-09-30T00:00:00+00:00", "01:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1985-03-30T23:59:59+00:00", "00:59:59", "CET", -60], ["1985-03-31T00:00:00+00:00", "02:00:00", "CEST", -120], ["1985-09-28T23:59:59+00:00", "01:59:59", "CEST", -120], ["1985-09-29T00:00:00+00:00", "01:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1986-03-29T23:59:59+00:00", "00:59:59", "CET", -60], ["1986-03-30T00:00:00+00:00", "02:00:00", "CEST", -120], ["1986-09-27T23:59:59+00:00", "01:59:59", "CEST", -120], ["1986-09-28T00:00:00+00:00", "01:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1987-03-28T23:59:59+00:00", "00:59:59", "CET", -60], ["1987-03-29T00:00:00+00:00", "02:00:00", "CEST", -120], ["1987-09-26T23:59:59+00:00", "01:59:59", "CEST", -120], ["1987-09-27T00:00:00+00:00", "01:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1988-03-27T00:59:59+00:00", "01:59:59", "CET", -60], ["1988-03-27T01:00:00+00:00", "03:00:00", "CEST", -120], ["1988-09-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["1988-09-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1989-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["1989-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["1989-09-24T00:59:59+00:00", "02:59:59", "CEST", -120], ["1989-09-24T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1990-03-25T00:59:59+00:00", "01:59:59", "CET", -60], ["1990-03-25T01:00:00+00:00", "03:00:00", "CEST", -120], ["1990-09-30T00:59:59+00:00", "02:59:59", "CEST", -120], ["1990-09-30T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1991-03-31T00:59:59+00:00", "01:59:59", "CET", -60], ["1991-03-31T01:00:00+00:00", "03:00:00", "CEST", -120], ["1991-09-29T00:59:59+00:00", "02:59:59", "CEST", -120], ["1991-09-29T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1992-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["1992-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["1992-09-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["1992-09-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1993-03-28T00:59:59+00:00", "01:59:59", "CET", -60], ["1993-03-28T01:00:00+00:00", "03:00:00", "CEST", -120], ["1993-09-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["1993-09-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1994-03-27T00:59:59+00:00", "01:59:59", "CET", -60], ["1994-03-27T01:00:00+00:00", "03:00:00", "CEST", -120], ["1994-09-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["1994-09-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1995-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["1995-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["1995-09-24T00:59:59+00:00", "02:59:59", "CEST", -120], ["1995-09-24T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1996-03-31T00:59:59+00:00", "01:59:59", "CET", -60], ["1996-03-31T01:00:00+00:00", "03:00:00", "CEST", -120], ["1996-10-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["1996-10-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1997-03-30T00:59:59+00:00", "01:59:59", "CET", -60], ["1997-03-30T01:00:00+00:00", "03:00:00", "CEST", -120], ["1997-10-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["1997-10-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1998-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["1998-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["1998-10-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["1998-10-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["1999-03-28T00:59:59+00:00", "01:59:59", "CET", -60], ["1999-03-28T01:00:00+00:00", "03:00:00", "CEST", -120], ["1999-10-31T00:59:59+00:00", "02:59:59", "CEST", -120], ["1999-10-31T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2000-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["2000-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["2000-10-29T00:59:59+00:00", "02:59:59", "CEST", -120], ["2000-10-29T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2001-03-25T00:59:59+00:00", "01:59:59", "CET", -60], ["2001-03-25T01:00:00+00:00", "03:00:00", "CEST", -120], ["2001-10-28T00:59:59+00:00", "02:59:59", "CEST", -120], ["2001-10-28T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2002-03-31T00:59:59+00:00", "01:59:59", "CET", -60], ["2002-03-31T01:00:00+00:00", "03:00:00", "CEST", -120], ["2002-10-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["2002-10-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2003-03-30T00:59:59+00:00", "01:59:59", "CET", -60], ["2003-03-30T01:00:00+00:00", "03:00:00", "CEST", -120], ["2003-10-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["2003-10-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2004-03-28T00:59:59+00:00", "01:59:59", "CET", -60], ["2004-03-28T01:00:00+00:00", "03:00:00", "CEST", -120], ["2004-10-31T00:59:59+00:00", "02:59:59", "CEST", -120], ["2004-10-31T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2005-03-27T00:59:59+00:00", "01:59:59", "CET", -60], ["2005-03-27T01:00:00+00:00", "03:00:00", "CEST", -120], ["2005-10-30T00:59:59+00:00", "02:59:59", "CEST", -120], ["2005-10-30T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2006-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["2006-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["2006-10-29T00:59:59+00:00", "02:59:59", "CEST", -120], ["2006-10-29T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2007-03-25T00:59:59+00:00", "01:59:59", "CET", -60], ["2007-03-25T01:00:00+00:00", "03:00:00", "CEST", -120], ["2007-10-28T00:59:59+00:00", "02:59:59", "CEST", -120], ["2007-10-28T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2008-03-30T00:59:59+00:00", "01:59:59", "CET", -60], ["2008-03-30T01:00:00+00:00", "03:00:00", "CEST", -120], ["2008-10-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["2008-10-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2009-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["2009-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["2009-10-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["2009-10-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2010-03-28T00:59:59+00:00", "01:59:59", "CET", -60], ["2010-03-28T01:00:00+00:00", "03:00:00", "CEST", -120], ["2010-10-31T00:59:59+00:00", "02:59:59", "CEST", -120], ["2010-10-31T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2011-03-27T00:59:59+00:00", "01:59:59", "CET", -60], ["2011-03-27T01:00:00+00:00", "03:00:00", "CEST", -120], ["2011-10-30T00:59:59+00:00", "02:59:59", "CEST", -120], ["2011-10-30T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2012-03-25T00:59:59+00:00", "01:59:59", "CET", -60], ["2012-03-25T01:00:00+00:00", "03:00:00", "CEST", -120], ["2012-10-28T00:59:59+00:00", "02:59:59", "CEST", -120], ["2012-10-28T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2013-03-31T00:59:59+00:00", "01:59:59", "CET", -60], ["2013-03-31T01:00:00+00:00", "03:00:00", "CEST", -120], ["2013-10-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["2013-10-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2014-03-30T00:59:59+00:00", "01:59:59", "CET", -60], ["2014-03-30T01:00:00+00:00", "03:00:00", "CEST", -120], ["2014-10-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["2014-10-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2015-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["2015-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["2015-10-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["2015-10-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2016-03-27T00:59:59+00:00", "01:59:59", "CET", -60], ["2016-03-27T01:00:00+00:00", "03:00:00", "CEST", -120], ["2016-10-30T00:59:59+00:00", "02:59:59", "CEST", -120], ["2016-10-30T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2017-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["2017-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["2017-10-29T00:59:59+00:00", "02:59:59", "CEST", -120], ["2017-10-29T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2018-03-25T00:59:59+00:00", "01:59:59", "CET", -60], ["2018-03-25T01:00:00+00:00", "03:00:00", "CEST", -120], ["2018-10-28T00:59:59+00:00", "02:59:59", "CEST", -120], ["2018-10-28T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2019-03-31T00:59:59+00:00", "01:59:59", "CET", -60], ["2019-03-31T01:00:00+00:00", "03:00:00", "CEST", -120], ["2019-10-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["2019-10-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2020-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["2020-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["2020-10-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["2020-10-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2021-03-28T00:59:59+00:00", "01:59:59", "CET", -60], ["2021-03-28T01:00:00+00:00", "03:00:00", "CEST", -120], ["2021-10-31T00:59:59+00:00", "02:59:59", "CEST", -120], ["2021-10-31T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2022-03-27T00:59:59+00:00", "01:59:59", "CET", -60], ["2022-03-27T01:00:00+00:00", "03:00:00", "CEST", -120], ["2022-10-30T00:59:59+00:00", "02:59:59", "CEST", -120], ["2022-10-30T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2023-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["2023-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["2023-10-29T00:59:59+00:00", "02:59:59", "CEST", -120], ["2023-10-29T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2024-03-31T00:59:59+00:00", "01:59:59", "CET", -60], ["2024-03-31T01:00:00+00:00", "03:00:00", "CEST", -120], ["2024-10-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["2024-10-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2025-03-30T00:59:59+00:00", "01:59:59", "CET", -60], ["2025-03-30T01:00:00+00:00", "03:00:00", "CEST", -120], ["2025-10-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["2025-10-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2026-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["2026-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["2026-10-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["2026-10-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2027-03-28T00:59:59+00:00", "01:59:59", "CET", -60], ["2027-03-28T01:00:00+00:00", "03:00:00", "CEST", -120], ["2027-10-31T00:59:59+00:00", "02:59:59", "CEST", -120], ["2027-10-31T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2028-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["2028-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["2028-10-29T00:59:59+00:00", "02:59:59", "CEST", -120], ["2028-10-29T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2029-03-25T00:59:59+00:00", "01:59:59", "CET", -60], ["2029-03-25T01:00:00+00:00", "03:00:00", "CEST", -120], ["2029-10-28T00:59:59+00:00", "02:59:59", "CEST", -120], ["2029-10-28T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2030-03-31T00:59:59+00:00", "01:59:59", "CET", -60], ["2030-03-31T01:00:00+00:00", "03:00:00", "CEST", -120], ["2030-10-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["2030-10-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2031-03-30T00:59:59+00:00", "01:59:59", "CET", -60], ["2031-03-30T01:00:00+00:00", "03:00:00", "CEST", -120], ["2031-10-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["2031-10-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2032-03-28T00:59:59+00:00", "01:59:59", "CET", -60], ["2032-03-28T01:00:00+00:00", "03:00:00", "CEST", -120], ["2032-10-31T00:59:59+00:00", "02:59:59", "CEST", -120], ["2032-10-31T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2033-03-27T00:59:59+00:00", "01:59:59", "CET", -60], ["2033-03-27T01:00:00+00:00", "03:00:00", "CEST", -120], ["2033-10-30T00:59:59+00:00", "02:59:59", "CEST", -120], ["2033-10-30T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2034-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["2034-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["2034-10-29T00:59:59+00:00", "02:59:59", "CEST", -120], ["2034-10-29T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2035-03-25T00:59:59+00:00", "01:59:59", "CET", -60], ["2035-03-25T01:00:00+00:00", "03:00:00", "CEST", -120], ["2035-10-28T00:59:59+00:00", "02:59:59", "CEST", -120], ["2035-10-28T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2036-03-30T00:59:59+00:00", "01:59:59", "CET", -60], ["2036-03-30T01:00:00+00:00", "03:00:00", "CEST", -120], ["2036-10-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["2036-10-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Warsaw", [["2037-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["2037-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["2037-10-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["2037-10-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
    });
});
