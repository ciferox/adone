

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Antarctica/South_Pole", () => {
        helpers.testYear("Antarctica/South_Pole", [["1927-11-05T14:29:59+00:00", "01:59:59", "NZMT", -690], ["1927-11-05T14:30:00+00:00", "03:00:00", "NZST", -750]]);
        helpers.testYear("Antarctica/South_Pole", [["1928-03-03T13:29:59+00:00", "01:59:59", "NZST", -750], ["1928-03-03T13:30:00+00:00", "01:00:00", "NZMT", -690], ["1928-10-13T14:29:59+00:00", "01:59:59", "NZMT", -690], ["1928-10-13T14:30:00+00:00", "02:30:00", "NZST", -720]]);
        helpers.testYear("Antarctica/South_Pole", [["1929-03-16T13:59:59+00:00", "01:59:59", "NZST", -720], ["1929-03-16T14:00:00+00:00", "01:30:00", "NZMT", -690], ["1929-10-12T14:29:59+00:00", "01:59:59", "NZMT", -690], ["1929-10-12T14:30:00+00:00", "02:30:00", "NZST", -720]]);
        helpers.testYear("Antarctica/South_Pole", [["1930-03-15T13:59:59+00:00", "01:59:59", "NZST", -720], ["1930-03-15T14:00:00+00:00", "01:30:00", "NZMT", -690], ["1930-10-11T14:29:59+00:00", "01:59:59", "NZMT", -690], ["1930-10-11T14:30:00+00:00", "02:30:00", "NZST", -720]]);
        helpers.testYear("Antarctica/South_Pole", [["1931-03-14T13:59:59+00:00", "01:59:59", "NZST", -720], ["1931-03-14T14:00:00+00:00", "01:30:00", "NZMT", -690], ["1931-10-10T14:29:59+00:00", "01:59:59", "NZMT", -690], ["1931-10-10T14:30:00+00:00", "02:30:00", "NZST", -720]]);
        helpers.testYear("Antarctica/South_Pole", [["1932-03-19T13:59:59+00:00", "01:59:59", "NZST", -720], ["1932-03-19T14:00:00+00:00", "01:30:00", "NZMT", -690], ["1932-10-08T14:29:59+00:00", "01:59:59", "NZMT", -690], ["1932-10-08T14:30:00+00:00", "02:30:00", "NZST", -720]]);
        helpers.testYear("Antarctica/South_Pole", [["1933-03-18T13:59:59+00:00", "01:59:59", "NZST", -720], ["1933-03-18T14:00:00+00:00", "01:30:00", "NZMT", -690], ["1933-10-07T14:29:59+00:00", "01:59:59", "NZMT", -690], ["1933-10-07T14:30:00+00:00", "02:30:00", "NZST", -720]]);
        helpers.testYear("Antarctica/South_Pole", [["1934-04-28T13:59:59+00:00", "01:59:59", "NZST", -720], ["1934-04-28T14:00:00+00:00", "01:30:00", "NZMT", -690], ["1934-09-29T14:29:59+00:00", "01:59:59", "NZMT", -690], ["1934-09-29T14:30:00+00:00", "02:30:00", "NZST", -720]]);
        helpers.testYear("Antarctica/South_Pole", [["1935-04-27T13:59:59+00:00", "01:59:59", "NZST", -720], ["1935-04-27T14:00:00+00:00", "01:30:00", "NZMT", -690], ["1935-09-28T14:29:59+00:00", "01:59:59", "NZMT", -690], ["1935-09-28T14:30:00+00:00", "02:30:00", "NZST", -720]]);
        helpers.testYear("Antarctica/South_Pole", [["1936-04-25T13:59:59+00:00", "01:59:59", "NZST", -720], ["1936-04-25T14:00:00+00:00", "01:30:00", "NZMT", -690], ["1936-09-26T14:29:59+00:00", "01:59:59", "NZMT", -690], ["1936-09-26T14:30:00+00:00", "02:30:00", "NZST", -720]]);
        helpers.testYear("Antarctica/South_Pole", [["1937-04-24T13:59:59+00:00", "01:59:59", "NZST", -720], ["1937-04-24T14:00:00+00:00", "01:30:00", "NZMT", -690], ["1937-09-25T14:29:59+00:00", "01:59:59", "NZMT", -690], ["1937-09-25T14:30:00+00:00", "02:30:00", "NZST", -720]]);
        helpers.testYear("Antarctica/South_Pole", [["1938-04-23T13:59:59+00:00", "01:59:59", "NZST", -720], ["1938-04-23T14:00:00+00:00", "01:30:00", "NZMT", -690], ["1938-09-24T14:29:59+00:00", "01:59:59", "NZMT", -690], ["1938-09-24T14:30:00+00:00", "02:30:00", "NZST", -720]]);
        helpers.testYear("Antarctica/South_Pole", [["1939-04-29T13:59:59+00:00", "01:59:59", "NZST", -720], ["1939-04-29T14:00:00+00:00", "01:30:00", "NZMT", -690], ["1939-09-23T14:29:59+00:00", "01:59:59", "NZMT", -690], ["1939-09-23T14:30:00+00:00", "02:30:00", "NZST", -720]]);
        helpers.testYear("Antarctica/South_Pole", [["1940-04-27T13:59:59+00:00", "01:59:59", "NZST", -720], ["1940-04-27T14:00:00+00:00", "01:30:00", "NZMT", -690], ["1940-09-28T14:29:59+00:00", "01:59:59", "NZMT", -690], ["1940-09-28T14:30:00+00:00", "02:30:00", "NZST", -720]]);
        helpers.testYear("Antarctica/South_Pole", [["1945-12-31T11:59:59+00:00", "23:59:59", "NZST", -720], ["1945-12-31T12:00:00+00:00", "00:00:00", "NZST", -720]]);
        helpers.testYear("Antarctica/South_Pole", [["1974-11-02T13:59:59+00:00", "01:59:59", "NZST", -720], ["1974-11-02T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["1975-02-22T13:59:59+00:00", "02:59:59", "NZDT", -780], ["1975-02-22T14:00:00+00:00", "02:00:00", "NZST", -720], ["1975-10-25T13:59:59+00:00", "01:59:59", "NZST", -720], ["1975-10-25T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["1976-03-06T13:59:59+00:00", "02:59:59", "NZDT", -780], ["1976-03-06T14:00:00+00:00", "02:00:00", "NZST", -720], ["1976-10-30T13:59:59+00:00", "01:59:59", "NZST", -720], ["1976-10-30T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["1977-03-05T13:59:59+00:00", "02:59:59", "NZDT", -780], ["1977-03-05T14:00:00+00:00", "02:00:00", "NZST", -720], ["1977-10-29T13:59:59+00:00", "01:59:59", "NZST", -720], ["1977-10-29T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["1978-03-04T13:59:59+00:00", "02:59:59", "NZDT", -780], ["1978-03-04T14:00:00+00:00", "02:00:00", "NZST", -720], ["1978-10-28T13:59:59+00:00", "01:59:59", "NZST", -720], ["1978-10-28T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["1979-03-03T13:59:59+00:00", "02:59:59", "NZDT", -780], ["1979-03-03T14:00:00+00:00", "02:00:00", "NZST", -720], ["1979-10-27T13:59:59+00:00", "01:59:59", "NZST", -720], ["1979-10-27T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["1980-03-01T13:59:59+00:00", "02:59:59", "NZDT", -780], ["1980-03-01T14:00:00+00:00", "02:00:00", "NZST", -720], ["1980-10-25T13:59:59+00:00", "01:59:59", "NZST", -720], ["1980-10-25T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["1981-02-28T13:59:59+00:00", "02:59:59", "NZDT", -780], ["1981-02-28T14:00:00+00:00", "02:00:00", "NZST", -720], ["1981-10-24T13:59:59+00:00", "01:59:59", "NZST", -720], ["1981-10-24T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["1982-03-06T13:59:59+00:00", "02:59:59", "NZDT", -780], ["1982-03-06T14:00:00+00:00", "02:00:00", "NZST", -720], ["1982-10-30T13:59:59+00:00", "01:59:59", "NZST", -720], ["1982-10-30T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["1983-03-05T13:59:59+00:00", "02:59:59", "NZDT", -780], ["1983-03-05T14:00:00+00:00", "02:00:00", "NZST", -720], ["1983-10-29T13:59:59+00:00", "01:59:59", "NZST", -720], ["1983-10-29T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["1984-03-03T13:59:59+00:00", "02:59:59", "NZDT", -780], ["1984-03-03T14:00:00+00:00", "02:00:00", "NZST", -720], ["1984-10-27T13:59:59+00:00", "01:59:59", "NZST", -720], ["1984-10-27T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["1985-03-02T13:59:59+00:00", "02:59:59", "NZDT", -780], ["1985-03-02T14:00:00+00:00", "02:00:00", "NZST", -720], ["1985-10-26T13:59:59+00:00", "01:59:59", "NZST", -720], ["1985-10-26T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["1986-03-01T13:59:59+00:00", "02:59:59", "NZDT", -780], ["1986-03-01T14:00:00+00:00", "02:00:00", "NZST", -720], ["1986-10-25T13:59:59+00:00", "01:59:59", "NZST", -720], ["1986-10-25T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["1987-02-28T13:59:59+00:00", "02:59:59", "NZDT", -780], ["1987-02-28T14:00:00+00:00", "02:00:00", "NZST", -720], ["1987-10-24T13:59:59+00:00", "01:59:59", "NZST", -720], ["1987-10-24T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["1988-03-05T13:59:59+00:00", "02:59:59", "NZDT", -780], ["1988-03-05T14:00:00+00:00", "02:00:00", "NZST", -720], ["1988-10-29T13:59:59+00:00", "01:59:59", "NZST", -720], ["1988-10-29T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["1989-03-04T13:59:59+00:00", "02:59:59", "NZDT", -780], ["1989-03-04T14:00:00+00:00", "02:00:00", "NZST", -720], ["1989-10-07T13:59:59+00:00", "01:59:59", "NZST", -720], ["1989-10-07T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["1990-03-17T13:59:59+00:00", "02:59:59", "NZDT", -780], ["1990-03-17T14:00:00+00:00", "02:00:00", "NZST", -720], ["1990-10-06T13:59:59+00:00", "01:59:59", "NZST", -720], ["1990-10-06T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["1991-03-16T13:59:59+00:00", "02:59:59", "NZDT", -780], ["1991-03-16T14:00:00+00:00", "02:00:00", "NZST", -720], ["1991-10-05T13:59:59+00:00", "01:59:59", "NZST", -720], ["1991-10-05T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["1992-03-14T13:59:59+00:00", "02:59:59", "NZDT", -780], ["1992-03-14T14:00:00+00:00", "02:00:00", "NZST", -720], ["1992-10-03T13:59:59+00:00", "01:59:59", "NZST", -720], ["1992-10-03T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["1993-03-20T13:59:59+00:00", "02:59:59", "NZDT", -780], ["1993-03-20T14:00:00+00:00", "02:00:00", "NZST", -720], ["1993-10-02T13:59:59+00:00", "01:59:59", "NZST", -720], ["1993-10-02T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["1994-03-19T13:59:59+00:00", "02:59:59", "NZDT", -780], ["1994-03-19T14:00:00+00:00", "02:00:00", "NZST", -720], ["1994-10-01T13:59:59+00:00", "01:59:59", "NZST", -720], ["1994-10-01T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["1995-03-18T13:59:59+00:00", "02:59:59", "NZDT", -780], ["1995-03-18T14:00:00+00:00", "02:00:00", "NZST", -720], ["1995-09-30T13:59:59+00:00", "01:59:59", "NZST", -720], ["1995-09-30T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["1996-03-16T13:59:59+00:00", "02:59:59", "NZDT", -780], ["1996-03-16T14:00:00+00:00", "02:00:00", "NZST", -720], ["1996-10-05T13:59:59+00:00", "01:59:59", "NZST", -720], ["1996-10-05T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["1997-03-15T13:59:59+00:00", "02:59:59", "NZDT", -780], ["1997-03-15T14:00:00+00:00", "02:00:00", "NZST", -720], ["1997-10-04T13:59:59+00:00", "01:59:59", "NZST", -720], ["1997-10-04T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["1998-03-14T13:59:59+00:00", "02:59:59", "NZDT", -780], ["1998-03-14T14:00:00+00:00", "02:00:00", "NZST", -720], ["1998-10-03T13:59:59+00:00", "01:59:59", "NZST", -720], ["1998-10-03T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["1999-03-20T13:59:59+00:00", "02:59:59", "NZDT", -780], ["1999-03-20T14:00:00+00:00", "02:00:00", "NZST", -720], ["1999-10-02T13:59:59+00:00", "01:59:59", "NZST", -720], ["1999-10-02T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2000-03-18T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2000-03-18T14:00:00+00:00", "02:00:00", "NZST", -720], ["2000-09-30T13:59:59+00:00", "01:59:59", "NZST", -720], ["2000-09-30T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2001-03-17T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2001-03-17T14:00:00+00:00", "02:00:00", "NZST", -720], ["2001-10-06T13:59:59+00:00", "01:59:59", "NZST", -720], ["2001-10-06T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2002-03-16T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2002-03-16T14:00:00+00:00", "02:00:00", "NZST", -720], ["2002-10-05T13:59:59+00:00", "01:59:59", "NZST", -720], ["2002-10-05T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2003-03-15T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2003-03-15T14:00:00+00:00", "02:00:00", "NZST", -720], ["2003-10-04T13:59:59+00:00", "01:59:59", "NZST", -720], ["2003-10-04T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2004-03-20T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2004-03-20T14:00:00+00:00", "02:00:00", "NZST", -720], ["2004-10-02T13:59:59+00:00", "01:59:59", "NZST", -720], ["2004-10-02T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2005-03-19T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2005-03-19T14:00:00+00:00", "02:00:00", "NZST", -720], ["2005-10-01T13:59:59+00:00", "01:59:59", "NZST", -720], ["2005-10-01T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2006-03-18T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2006-03-18T14:00:00+00:00", "02:00:00", "NZST", -720], ["2006-09-30T13:59:59+00:00", "01:59:59", "NZST", -720], ["2006-09-30T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2007-03-17T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2007-03-17T14:00:00+00:00", "02:00:00", "NZST", -720], ["2007-09-29T13:59:59+00:00", "01:59:59", "NZST", -720], ["2007-09-29T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2008-04-05T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2008-04-05T14:00:00+00:00", "02:00:00", "NZST", -720], ["2008-09-27T13:59:59+00:00", "01:59:59", "NZST", -720], ["2008-09-27T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2009-04-04T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2009-04-04T14:00:00+00:00", "02:00:00", "NZST", -720], ["2009-09-26T13:59:59+00:00", "01:59:59", "NZST", -720], ["2009-09-26T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2010-04-03T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2010-04-03T14:00:00+00:00", "02:00:00", "NZST", -720], ["2010-09-25T13:59:59+00:00", "01:59:59", "NZST", -720], ["2010-09-25T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2011-04-02T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2011-04-02T14:00:00+00:00", "02:00:00", "NZST", -720], ["2011-09-24T13:59:59+00:00", "01:59:59", "NZST", -720], ["2011-09-24T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2012-03-31T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2012-03-31T14:00:00+00:00", "02:00:00", "NZST", -720], ["2012-09-29T13:59:59+00:00", "01:59:59", "NZST", -720], ["2012-09-29T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2013-04-06T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2013-04-06T14:00:00+00:00", "02:00:00", "NZST", -720], ["2013-09-28T13:59:59+00:00", "01:59:59", "NZST", -720], ["2013-09-28T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2014-04-05T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2014-04-05T14:00:00+00:00", "02:00:00", "NZST", -720], ["2014-09-27T13:59:59+00:00", "01:59:59", "NZST", -720], ["2014-09-27T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2015-04-04T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2015-04-04T14:00:00+00:00", "02:00:00", "NZST", -720], ["2015-09-26T13:59:59+00:00", "01:59:59", "NZST", -720], ["2015-09-26T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2016-04-02T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2016-04-02T14:00:00+00:00", "02:00:00", "NZST", -720], ["2016-09-24T13:59:59+00:00", "01:59:59", "NZST", -720], ["2016-09-24T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2017-04-01T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2017-04-01T14:00:00+00:00", "02:00:00", "NZST", -720], ["2017-09-23T13:59:59+00:00", "01:59:59", "NZST", -720], ["2017-09-23T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2018-03-31T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2018-03-31T14:00:00+00:00", "02:00:00", "NZST", -720], ["2018-09-29T13:59:59+00:00", "01:59:59", "NZST", -720], ["2018-09-29T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2019-04-06T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2019-04-06T14:00:00+00:00", "02:00:00", "NZST", -720], ["2019-09-28T13:59:59+00:00", "01:59:59", "NZST", -720], ["2019-09-28T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2020-04-04T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2020-04-04T14:00:00+00:00", "02:00:00", "NZST", -720], ["2020-09-26T13:59:59+00:00", "01:59:59", "NZST", -720], ["2020-09-26T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2021-04-03T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2021-04-03T14:00:00+00:00", "02:00:00", "NZST", -720], ["2021-09-25T13:59:59+00:00", "01:59:59", "NZST", -720], ["2021-09-25T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2022-04-02T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2022-04-02T14:00:00+00:00", "02:00:00", "NZST", -720], ["2022-09-24T13:59:59+00:00", "01:59:59", "NZST", -720], ["2022-09-24T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2023-04-01T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2023-04-01T14:00:00+00:00", "02:00:00", "NZST", -720], ["2023-09-23T13:59:59+00:00", "01:59:59", "NZST", -720], ["2023-09-23T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2024-04-06T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2024-04-06T14:00:00+00:00", "02:00:00", "NZST", -720], ["2024-09-28T13:59:59+00:00", "01:59:59", "NZST", -720], ["2024-09-28T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2025-04-05T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2025-04-05T14:00:00+00:00", "02:00:00", "NZST", -720], ["2025-09-27T13:59:59+00:00", "01:59:59", "NZST", -720], ["2025-09-27T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2026-04-04T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2026-04-04T14:00:00+00:00", "02:00:00", "NZST", -720], ["2026-09-26T13:59:59+00:00", "01:59:59", "NZST", -720], ["2026-09-26T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2027-04-03T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2027-04-03T14:00:00+00:00", "02:00:00", "NZST", -720], ["2027-09-25T13:59:59+00:00", "01:59:59", "NZST", -720], ["2027-09-25T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2028-04-01T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2028-04-01T14:00:00+00:00", "02:00:00", "NZST", -720], ["2028-09-23T13:59:59+00:00", "01:59:59", "NZST", -720], ["2028-09-23T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2029-03-31T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2029-03-31T14:00:00+00:00", "02:00:00", "NZST", -720], ["2029-09-29T13:59:59+00:00", "01:59:59", "NZST", -720], ["2029-09-29T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2030-04-06T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2030-04-06T14:00:00+00:00", "02:00:00", "NZST", -720], ["2030-09-28T13:59:59+00:00", "01:59:59", "NZST", -720], ["2030-09-28T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2031-04-05T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2031-04-05T14:00:00+00:00", "02:00:00", "NZST", -720], ["2031-09-27T13:59:59+00:00", "01:59:59", "NZST", -720], ["2031-09-27T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2032-04-03T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2032-04-03T14:00:00+00:00", "02:00:00", "NZST", -720], ["2032-09-25T13:59:59+00:00", "01:59:59", "NZST", -720], ["2032-09-25T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2033-04-02T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2033-04-02T14:00:00+00:00", "02:00:00", "NZST", -720], ["2033-09-24T13:59:59+00:00", "01:59:59", "NZST", -720], ["2033-09-24T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2034-04-01T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2034-04-01T14:00:00+00:00", "02:00:00", "NZST", -720], ["2034-09-23T13:59:59+00:00", "01:59:59", "NZST", -720], ["2034-09-23T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2035-03-31T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2035-03-31T14:00:00+00:00", "02:00:00", "NZST", -720], ["2035-09-29T13:59:59+00:00", "01:59:59", "NZST", -720], ["2035-09-29T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2036-04-05T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2036-04-05T14:00:00+00:00", "02:00:00", "NZST", -720], ["2036-09-27T13:59:59+00:00", "01:59:59", "NZST", -720], ["2036-09-27T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
        helpers.testYear("Antarctica/South_Pole", [["2037-04-04T13:59:59+00:00", "02:59:59", "NZDT", -780], ["2037-04-04T14:00:00+00:00", "02:00:00", "NZST", -720], ["2037-09-26T13:59:59+00:00", "01:59:59", "NZST", -720], ["2037-09-26T14:00:00+00:00", "03:00:00", "NZDT", -780]]);
    });
});
