

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Mexico/BajaNorte", () => {
        helpers.testYear("Mexico/BajaNorte", [["1922-01-01T07:59:59+00:00", "00:11:55", "LMT", 28084 / 60], ["1922-01-01T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("Mexico/BajaNorte", [["1924-01-01T06:59:59+00:00", "23:59:59", "MST", 420], ["1924-01-01T07:00:00+00:00", "23:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1927-06-11T06:59:59+00:00", "22:59:59", "PST", 480], ["1927-06-11T07:00:00+00:00", "00:00:00", "MST", 420]]);
        helpers.testYear("Mexico/BajaNorte", [["1930-11-15T06:59:59+00:00", "23:59:59", "MST", 420], ["1930-11-15T07:00:00+00:00", "23:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1931-04-01T07:59:59+00:00", "23:59:59", "PST", 480], ["1931-04-01T08:00:00+00:00", "01:00:00", "PDT", 420], ["1931-09-30T06:59:59+00:00", "23:59:59", "PDT", 420], ["1931-09-30T07:00:00+00:00", "23:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1942-04-24T07:59:59+00:00", "23:59:59", "PST", 480], ["1942-04-24T08:00:00+00:00", "01:00:00", "PWT", 420]]);
        helpers.testYear("Mexico/BajaNorte", [["1945-08-14T22:59:59+00:00", "15:59:59", "PWT", 420], ["1945-08-14T23:00:00+00:00", "16:00:00", "PPT", 420], ["1945-11-12T06:59:59+00:00", "23:59:59", "PPT", 420], ["1945-11-12T07:00:00+00:00", "23:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1948-04-05T07:59:59+00:00", "23:59:59", "PST", 480], ["1948-04-05T08:00:00+00:00", "01:00:00", "PDT", 420]]);
        helpers.testYear("Mexico/BajaNorte", [["1949-01-14T06:59:59+00:00", "23:59:59", "PDT", 420], ["1949-01-14T07:00:00+00:00", "23:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1954-04-25T08:59:59+00:00", "00:59:59", "PST", 480], ["1954-04-25T09:00:00+00:00", "02:00:00", "PDT", 420], ["1954-09-26T08:59:59+00:00", "01:59:59", "PDT", 420], ["1954-09-26T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1955-04-24T08:59:59+00:00", "00:59:59", "PST", 480], ["1955-04-24T09:00:00+00:00", "02:00:00", "PDT", 420], ["1955-09-25T08:59:59+00:00", "01:59:59", "PDT", 420], ["1955-09-25T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1956-04-29T08:59:59+00:00", "00:59:59", "PST", 480], ["1956-04-29T09:00:00+00:00", "02:00:00", "PDT", 420], ["1956-09-30T08:59:59+00:00", "01:59:59", "PDT", 420], ["1956-09-30T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1957-04-28T08:59:59+00:00", "00:59:59", "PST", 480], ["1957-04-28T09:00:00+00:00", "02:00:00", "PDT", 420], ["1957-09-29T08:59:59+00:00", "01:59:59", "PDT", 420], ["1957-09-29T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1958-04-27T08:59:59+00:00", "00:59:59", "PST", 480], ["1958-04-27T09:00:00+00:00", "02:00:00", "PDT", 420], ["1958-09-28T08:59:59+00:00", "01:59:59", "PDT", 420], ["1958-09-28T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1959-04-26T08:59:59+00:00", "00:59:59", "PST", 480], ["1959-04-26T09:00:00+00:00", "02:00:00", "PDT", 420], ["1959-09-27T08:59:59+00:00", "01:59:59", "PDT", 420], ["1959-09-27T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1960-04-24T08:59:59+00:00", "00:59:59", "PST", 480], ["1960-04-24T09:00:00+00:00", "02:00:00", "PDT", 420], ["1960-09-25T08:59:59+00:00", "01:59:59", "PDT", 420], ["1960-09-25T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1976-04-25T09:59:59+00:00", "01:59:59", "PST", 480], ["1976-04-25T10:00:00+00:00", "03:00:00", "PDT", 420], ["1976-10-31T08:59:59+00:00", "01:59:59", "PDT", 420], ["1976-10-31T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1977-04-24T09:59:59+00:00", "01:59:59", "PST", 480], ["1977-04-24T10:00:00+00:00", "03:00:00", "PDT", 420], ["1977-10-30T08:59:59+00:00", "01:59:59", "PDT", 420], ["1977-10-30T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1978-04-30T09:59:59+00:00", "01:59:59", "PST", 480], ["1978-04-30T10:00:00+00:00", "03:00:00", "PDT", 420], ["1978-10-29T08:59:59+00:00", "01:59:59", "PDT", 420], ["1978-10-29T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1979-04-29T09:59:59+00:00", "01:59:59", "PST", 480], ["1979-04-29T10:00:00+00:00", "03:00:00", "PDT", 420], ["1979-10-28T08:59:59+00:00", "01:59:59", "PDT", 420], ["1979-10-28T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1980-04-27T09:59:59+00:00", "01:59:59", "PST", 480], ["1980-04-27T10:00:00+00:00", "03:00:00", "PDT", 420], ["1980-10-26T08:59:59+00:00", "01:59:59", "PDT", 420], ["1980-10-26T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1981-04-26T09:59:59+00:00", "01:59:59", "PST", 480], ["1981-04-26T10:00:00+00:00", "03:00:00", "PDT", 420], ["1981-10-25T08:59:59+00:00", "01:59:59", "PDT", 420], ["1981-10-25T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1982-04-25T09:59:59+00:00", "01:59:59", "PST", 480], ["1982-04-25T10:00:00+00:00", "03:00:00", "PDT", 420], ["1982-10-31T08:59:59+00:00", "01:59:59", "PDT", 420], ["1982-10-31T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1983-04-24T09:59:59+00:00", "01:59:59", "PST", 480], ["1983-04-24T10:00:00+00:00", "03:00:00", "PDT", 420], ["1983-10-30T08:59:59+00:00", "01:59:59", "PDT", 420], ["1983-10-30T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1984-04-29T09:59:59+00:00", "01:59:59", "PST", 480], ["1984-04-29T10:00:00+00:00", "03:00:00", "PDT", 420], ["1984-10-28T08:59:59+00:00", "01:59:59", "PDT", 420], ["1984-10-28T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1985-04-28T09:59:59+00:00", "01:59:59", "PST", 480], ["1985-04-28T10:00:00+00:00", "03:00:00", "PDT", 420], ["1985-10-27T08:59:59+00:00", "01:59:59", "PDT", 420], ["1985-10-27T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1986-04-27T09:59:59+00:00", "01:59:59", "PST", 480], ["1986-04-27T10:00:00+00:00", "03:00:00", "PDT", 420], ["1986-10-26T08:59:59+00:00", "01:59:59", "PDT", 420], ["1986-10-26T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1987-04-05T09:59:59+00:00", "01:59:59", "PST", 480], ["1987-04-05T10:00:00+00:00", "03:00:00", "PDT", 420], ["1987-10-25T08:59:59+00:00", "01:59:59", "PDT", 420], ["1987-10-25T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1988-04-03T09:59:59+00:00", "01:59:59", "PST", 480], ["1988-04-03T10:00:00+00:00", "03:00:00", "PDT", 420], ["1988-10-30T08:59:59+00:00", "01:59:59", "PDT", 420], ["1988-10-30T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1989-04-02T09:59:59+00:00", "01:59:59", "PST", 480], ["1989-04-02T10:00:00+00:00", "03:00:00", "PDT", 420], ["1989-10-29T08:59:59+00:00", "01:59:59", "PDT", 420], ["1989-10-29T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1990-04-01T09:59:59+00:00", "01:59:59", "PST", 480], ["1990-04-01T10:00:00+00:00", "03:00:00", "PDT", 420], ["1990-10-28T08:59:59+00:00", "01:59:59", "PDT", 420], ["1990-10-28T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1991-04-07T09:59:59+00:00", "01:59:59", "PST", 480], ["1991-04-07T10:00:00+00:00", "03:00:00", "PDT", 420], ["1991-10-27T08:59:59+00:00", "01:59:59", "PDT", 420], ["1991-10-27T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1992-04-05T09:59:59+00:00", "01:59:59", "PST", 480], ["1992-04-05T10:00:00+00:00", "03:00:00", "PDT", 420], ["1992-10-25T08:59:59+00:00", "01:59:59", "PDT", 420], ["1992-10-25T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1993-04-04T09:59:59+00:00", "01:59:59", "PST", 480], ["1993-04-04T10:00:00+00:00", "03:00:00", "PDT", 420], ["1993-10-31T08:59:59+00:00", "01:59:59", "PDT", 420], ["1993-10-31T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1994-04-03T09:59:59+00:00", "01:59:59", "PST", 480], ["1994-04-03T10:00:00+00:00", "03:00:00", "PDT", 420], ["1994-10-30T08:59:59+00:00", "01:59:59", "PDT", 420], ["1994-10-30T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1995-04-02T09:59:59+00:00", "01:59:59", "PST", 480], ["1995-04-02T10:00:00+00:00", "03:00:00", "PDT", 420], ["1995-10-29T08:59:59+00:00", "01:59:59", "PDT", 420], ["1995-10-29T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1996-04-07T09:59:59+00:00", "01:59:59", "PST", 480], ["1996-04-07T10:00:00+00:00", "03:00:00", "PDT", 420], ["1996-10-27T08:59:59+00:00", "01:59:59", "PDT", 420], ["1996-10-27T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1997-04-06T09:59:59+00:00", "01:59:59", "PST", 480], ["1997-04-06T10:00:00+00:00", "03:00:00", "PDT", 420], ["1997-10-26T08:59:59+00:00", "01:59:59", "PDT", 420], ["1997-10-26T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1998-04-05T09:59:59+00:00", "01:59:59", "PST", 480], ["1998-04-05T10:00:00+00:00", "03:00:00", "PDT", 420], ["1998-10-25T08:59:59+00:00", "01:59:59", "PDT", 420], ["1998-10-25T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["1999-04-04T09:59:59+00:00", "01:59:59", "PST", 480], ["1999-04-04T10:00:00+00:00", "03:00:00", "PDT", 420], ["1999-10-31T08:59:59+00:00", "01:59:59", "PDT", 420], ["1999-10-31T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2000-04-02T09:59:59+00:00", "01:59:59", "PST", 480], ["2000-04-02T10:00:00+00:00", "03:00:00", "PDT", 420], ["2000-10-29T08:59:59+00:00", "01:59:59", "PDT", 420], ["2000-10-29T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2001-04-01T09:59:59+00:00", "01:59:59", "PST", 480], ["2001-04-01T10:00:00+00:00", "03:00:00", "PDT", 420], ["2001-10-28T08:59:59+00:00", "01:59:59", "PDT", 420], ["2001-10-28T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2002-04-07T09:59:59+00:00", "01:59:59", "PST", 480], ["2002-04-07T10:00:00+00:00", "03:00:00", "PDT", 420], ["2002-10-27T08:59:59+00:00", "01:59:59", "PDT", 420], ["2002-10-27T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2003-04-06T09:59:59+00:00", "01:59:59", "PST", 480], ["2003-04-06T10:00:00+00:00", "03:00:00", "PDT", 420], ["2003-10-26T08:59:59+00:00", "01:59:59", "PDT", 420], ["2003-10-26T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2004-04-04T09:59:59+00:00", "01:59:59", "PST", 480], ["2004-04-04T10:00:00+00:00", "03:00:00", "PDT", 420], ["2004-10-31T08:59:59+00:00", "01:59:59", "PDT", 420], ["2004-10-31T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2005-04-03T09:59:59+00:00", "01:59:59", "PST", 480], ["2005-04-03T10:00:00+00:00", "03:00:00", "PDT", 420], ["2005-10-30T08:59:59+00:00", "01:59:59", "PDT", 420], ["2005-10-30T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2006-04-02T09:59:59+00:00", "01:59:59", "PST", 480], ["2006-04-02T10:00:00+00:00", "03:00:00", "PDT", 420], ["2006-10-29T08:59:59+00:00", "01:59:59", "PDT", 420], ["2006-10-29T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2007-04-01T09:59:59+00:00", "01:59:59", "PST", 480], ["2007-04-01T10:00:00+00:00", "03:00:00", "PDT", 420], ["2007-10-28T08:59:59+00:00", "01:59:59", "PDT", 420], ["2007-10-28T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2008-04-06T09:59:59+00:00", "01:59:59", "PST", 480], ["2008-04-06T10:00:00+00:00", "03:00:00", "PDT", 420], ["2008-10-26T08:59:59+00:00", "01:59:59", "PDT", 420], ["2008-10-26T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2009-04-05T09:59:59+00:00", "01:59:59", "PST", 480], ["2009-04-05T10:00:00+00:00", "03:00:00", "PDT", 420], ["2009-10-25T08:59:59+00:00", "01:59:59", "PDT", 420], ["2009-10-25T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2010-03-14T09:59:59+00:00", "01:59:59", "PST", 480], ["2010-03-14T10:00:00+00:00", "03:00:00", "PDT", 420], ["2010-11-07T08:59:59+00:00", "01:59:59", "PDT", 420], ["2010-11-07T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2011-03-13T09:59:59+00:00", "01:59:59", "PST", 480], ["2011-03-13T10:00:00+00:00", "03:00:00", "PDT", 420], ["2011-11-06T08:59:59+00:00", "01:59:59", "PDT", 420], ["2011-11-06T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2012-03-11T09:59:59+00:00", "01:59:59", "PST", 480], ["2012-03-11T10:00:00+00:00", "03:00:00", "PDT", 420], ["2012-11-04T08:59:59+00:00", "01:59:59", "PDT", 420], ["2012-11-04T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2013-03-10T09:59:59+00:00", "01:59:59", "PST", 480], ["2013-03-10T10:00:00+00:00", "03:00:00", "PDT", 420], ["2013-11-03T08:59:59+00:00", "01:59:59", "PDT", 420], ["2013-11-03T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2014-03-09T09:59:59+00:00", "01:59:59", "PST", 480], ["2014-03-09T10:00:00+00:00", "03:00:00", "PDT", 420], ["2014-11-02T08:59:59+00:00", "01:59:59", "PDT", 420], ["2014-11-02T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2015-03-08T09:59:59+00:00", "01:59:59", "PST", 480], ["2015-03-08T10:00:00+00:00", "03:00:00", "PDT", 420], ["2015-11-01T08:59:59+00:00", "01:59:59", "PDT", 420], ["2015-11-01T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2016-03-13T09:59:59+00:00", "01:59:59", "PST", 480], ["2016-03-13T10:00:00+00:00", "03:00:00", "PDT", 420], ["2016-11-06T08:59:59+00:00", "01:59:59", "PDT", 420], ["2016-11-06T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2017-03-12T09:59:59+00:00", "01:59:59", "PST", 480], ["2017-03-12T10:00:00+00:00", "03:00:00", "PDT", 420], ["2017-11-05T08:59:59+00:00", "01:59:59", "PDT", 420], ["2017-11-05T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2018-03-11T09:59:59+00:00", "01:59:59", "PST", 480], ["2018-03-11T10:00:00+00:00", "03:00:00", "PDT", 420], ["2018-11-04T08:59:59+00:00", "01:59:59", "PDT", 420], ["2018-11-04T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2019-03-10T09:59:59+00:00", "01:59:59", "PST", 480], ["2019-03-10T10:00:00+00:00", "03:00:00", "PDT", 420], ["2019-11-03T08:59:59+00:00", "01:59:59", "PDT", 420], ["2019-11-03T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2020-03-08T09:59:59+00:00", "01:59:59", "PST", 480], ["2020-03-08T10:00:00+00:00", "03:00:00", "PDT", 420], ["2020-11-01T08:59:59+00:00", "01:59:59", "PDT", 420], ["2020-11-01T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2021-03-14T09:59:59+00:00", "01:59:59", "PST", 480], ["2021-03-14T10:00:00+00:00", "03:00:00", "PDT", 420], ["2021-11-07T08:59:59+00:00", "01:59:59", "PDT", 420], ["2021-11-07T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2022-03-13T09:59:59+00:00", "01:59:59", "PST", 480], ["2022-03-13T10:00:00+00:00", "03:00:00", "PDT", 420], ["2022-11-06T08:59:59+00:00", "01:59:59", "PDT", 420], ["2022-11-06T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2023-03-12T09:59:59+00:00", "01:59:59", "PST", 480], ["2023-03-12T10:00:00+00:00", "03:00:00", "PDT", 420], ["2023-11-05T08:59:59+00:00", "01:59:59", "PDT", 420], ["2023-11-05T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2024-03-10T09:59:59+00:00", "01:59:59", "PST", 480], ["2024-03-10T10:00:00+00:00", "03:00:00", "PDT", 420], ["2024-11-03T08:59:59+00:00", "01:59:59", "PDT", 420], ["2024-11-03T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2025-03-09T09:59:59+00:00", "01:59:59", "PST", 480], ["2025-03-09T10:00:00+00:00", "03:00:00", "PDT", 420], ["2025-11-02T08:59:59+00:00", "01:59:59", "PDT", 420], ["2025-11-02T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2026-03-08T09:59:59+00:00", "01:59:59", "PST", 480], ["2026-03-08T10:00:00+00:00", "03:00:00", "PDT", 420], ["2026-11-01T08:59:59+00:00", "01:59:59", "PDT", 420], ["2026-11-01T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2027-03-14T09:59:59+00:00", "01:59:59", "PST", 480], ["2027-03-14T10:00:00+00:00", "03:00:00", "PDT", 420], ["2027-11-07T08:59:59+00:00", "01:59:59", "PDT", 420], ["2027-11-07T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2028-03-12T09:59:59+00:00", "01:59:59", "PST", 480], ["2028-03-12T10:00:00+00:00", "03:00:00", "PDT", 420], ["2028-11-05T08:59:59+00:00", "01:59:59", "PDT", 420], ["2028-11-05T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2029-03-11T09:59:59+00:00", "01:59:59", "PST", 480], ["2029-03-11T10:00:00+00:00", "03:00:00", "PDT", 420], ["2029-11-04T08:59:59+00:00", "01:59:59", "PDT", 420], ["2029-11-04T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2030-03-10T09:59:59+00:00", "01:59:59", "PST", 480], ["2030-03-10T10:00:00+00:00", "03:00:00", "PDT", 420], ["2030-11-03T08:59:59+00:00", "01:59:59", "PDT", 420], ["2030-11-03T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2031-03-09T09:59:59+00:00", "01:59:59", "PST", 480], ["2031-03-09T10:00:00+00:00", "03:00:00", "PDT", 420], ["2031-11-02T08:59:59+00:00", "01:59:59", "PDT", 420], ["2031-11-02T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2032-03-14T09:59:59+00:00", "01:59:59", "PST", 480], ["2032-03-14T10:00:00+00:00", "03:00:00", "PDT", 420], ["2032-11-07T08:59:59+00:00", "01:59:59", "PDT", 420], ["2032-11-07T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2033-03-13T09:59:59+00:00", "01:59:59", "PST", 480], ["2033-03-13T10:00:00+00:00", "03:00:00", "PDT", 420], ["2033-11-06T08:59:59+00:00", "01:59:59", "PDT", 420], ["2033-11-06T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2034-03-12T09:59:59+00:00", "01:59:59", "PST", 480], ["2034-03-12T10:00:00+00:00", "03:00:00", "PDT", 420], ["2034-11-05T08:59:59+00:00", "01:59:59", "PDT", 420], ["2034-11-05T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2035-03-11T09:59:59+00:00", "01:59:59", "PST", 480], ["2035-03-11T10:00:00+00:00", "03:00:00", "PDT", 420], ["2035-11-04T08:59:59+00:00", "01:59:59", "PDT", 420], ["2035-11-04T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2036-03-09T09:59:59+00:00", "01:59:59", "PST", 480], ["2036-03-09T10:00:00+00:00", "03:00:00", "PDT", 420], ["2036-11-02T08:59:59+00:00", "01:59:59", "PDT", 420], ["2036-11-02T09:00:00+00:00", "01:00:00", "PST", 480]]);
        helpers.testYear("Mexico/BajaNorte", [["2037-03-08T09:59:59+00:00", "01:59:59", "PST", 480], ["2037-03-08T10:00:00+00:00", "03:00:00", "PDT", 420], ["2037-11-01T08:59:59+00:00", "01:59:59", "PDT", 420], ["2037-11-01T09:00:00+00:00", "01:00:00", "PST", 480]]);
    });
});
