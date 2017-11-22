

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Australia/Adelaide", () => {
        helpers.testGuess("Australia/Adelaide", {
            offset: true,
            abbr: true
        });
        helpers.testYear("Australia/Adelaide", [["1916-12-31T14:30:59+00:00", "00:00:59", "ACST", -570], ["1916-12-31T14:31:00+00:00", "01:01:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1917-03-24T15:29:59+00:00", "01:59:59", "ACDT", -630], ["1917-03-24T15:30:00+00:00", "01:00:00", "ACST", -570]]);
        helpers.testYear("Australia/Adelaide", [["1941-12-31T16:29:59+00:00", "01:59:59", "ACST", -570], ["1941-12-31T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1942-03-28T15:29:59+00:00", "01:59:59", "ACDT", -630], ["1942-03-28T15:30:00+00:00", "01:00:00", "ACST", -570], ["1942-09-26T16:29:59+00:00", "01:59:59", "ACST", -570], ["1942-09-26T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1943-03-27T15:29:59+00:00", "01:59:59", "ACDT", -630], ["1943-03-27T15:30:00+00:00", "01:00:00", "ACST", -570], ["1943-10-02T16:29:59+00:00", "01:59:59", "ACST", -570], ["1943-10-02T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1944-03-25T15:29:59+00:00", "01:59:59", "ACDT", -630], ["1944-03-25T15:30:00+00:00", "01:00:00", "ACST", -570]]);
        helpers.testYear("Australia/Adelaide", [["1971-10-30T16:29:59+00:00", "01:59:59", "ACST", -570], ["1971-10-30T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1972-02-26T16:29:59+00:00", "02:59:59", "ACDT", -630], ["1972-02-26T16:30:00+00:00", "02:00:00", "ACST", -570], ["1972-10-28T16:29:59+00:00", "01:59:59", "ACST", -570], ["1972-10-28T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1973-03-03T16:29:59+00:00", "02:59:59", "ACDT", -630], ["1973-03-03T16:30:00+00:00", "02:00:00", "ACST", -570], ["1973-10-27T16:29:59+00:00", "01:59:59", "ACST", -570], ["1973-10-27T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1974-03-02T16:29:59+00:00", "02:59:59", "ACDT", -630], ["1974-03-02T16:30:00+00:00", "02:00:00", "ACST", -570], ["1974-10-26T16:29:59+00:00", "01:59:59", "ACST", -570], ["1974-10-26T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1975-03-01T16:29:59+00:00", "02:59:59", "ACDT", -630], ["1975-03-01T16:30:00+00:00", "02:00:00", "ACST", -570], ["1975-10-25T16:29:59+00:00", "01:59:59", "ACST", -570], ["1975-10-25T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1976-03-06T16:29:59+00:00", "02:59:59", "ACDT", -630], ["1976-03-06T16:30:00+00:00", "02:00:00", "ACST", -570], ["1976-10-30T16:29:59+00:00", "01:59:59", "ACST", -570], ["1976-10-30T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1977-03-05T16:29:59+00:00", "02:59:59", "ACDT", -630], ["1977-03-05T16:30:00+00:00", "02:00:00", "ACST", -570], ["1977-10-29T16:29:59+00:00", "01:59:59", "ACST", -570], ["1977-10-29T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1978-03-04T16:29:59+00:00", "02:59:59", "ACDT", -630], ["1978-03-04T16:30:00+00:00", "02:00:00", "ACST", -570], ["1978-10-28T16:29:59+00:00", "01:59:59", "ACST", -570], ["1978-10-28T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1979-03-03T16:29:59+00:00", "02:59:59", "ACDT", -630], ["1979-03-03T16:30:00+00:00", "02:00:00", "ACST", -570], ["1979-10-27T16:29:59+00:00", "01:59:59", "ACST", -570], ["1979-10-27T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1980-03-01T16:29:59+00:00", "02:59:59", "ACDT", -630], ["1980-03-01T16:30:00+00:00", "02:00:00", "ACST", -570], ["1980-10-25T16:29:59+00:00", "01:59:59", "ACST", -570], ["1980-10-25T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1981-02-28T16:29:59+00:00", "02:59:59", "ACDT", -630], ["1981-02-28T16:30:00+00:00", "02:00:00", "ACST", -570], ["1981-10-24T16:29:59+00:00", "01:59:59", "ACST", -570], ["1981-10-24T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1982-03-06T16:29:59+00:00", "02:59:59", "ACDT", -630], ["1982-03-06T16:30:00+00:00", "02:00:00", "ACST", -570], ["1982-10-30T16:29:59+00:00", "01:59:59", "ACST", -570], ["1982-10-30T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1983-03-05T16:29:59+00:00", "02:59:59", "ACDT", -630], ["1983-03-05T16:30:00+00:00", "02:00:00", "ACST", -570], ["1983-10-29T16:29:59+00:00", "01:59:59", "ACST", -570], ["1983-10-29T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1984-03-03T16:29:59+00:00", "02:59:59", "ACDT", -630], ["1984-03-03T16:30:00+00:00", "02:00:00", "ACST", -570], ["1984-10-27T16:29:59+00:00", "01:59:59", "ACST", -570], ["1984-10-27T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1985-03-02T16:29:59+00:00", "02:59:59", "ACDT", -630], ["1985-03-02T16:30:00+00:00", "02:00:00", "ACST", -570], ["1985-10-26T16:29:59+00:00", "01:59:59", "ACST", -570], ["1985-10-26T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1986-03-15T16:29:59+00:00", "02:59:59", "ACDT", -630], ["1986-03-15T16:30:00+00:00", "02:00:00", "ACST", -570], ["1986-10-18T16:29:59+00:00", "01:59:59", "ACST", -570], ["1986-10-18T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1987-03-14T16:29:59+00:00", "02:59:59", "ACDT", -630], ["1987-03-14T16:30:00+00:00", "02:00:00", "ACST", -570], ["1987-10-24T16:29:59+00:00", "01:59:59", "ACST", -570], ["1987-10-24T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1988-03-19T16:29:59+00:00", "02:59:59", "ACDT", -630], ["1988-03-19T16:30:00+00:00", "02:00:00", "ACST", -570], ["1988-10-29T16:29:59+00:00", "01:59:59", "ACST", -570], ["1988-10-29T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1989-03-18T16:29:59+00:00", "02:59:59", "ACDT", -630], ["1989-03-18T16:30:00+00:00", "02:00:00", "ACST", -570], ["1989-10-28T16:29:59+00:00", "01:59:59", "ACST", -570], ["1989-10-28T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1990-03-17T16:29:59+00:00", "02:59:59", "ACDT", -630], ["1990-03-17T16:30:00+00:00", "02:00:00", "ACST", -570], ["1990-10-27T16:29:59+00:00", "01:59:59", "ACST", -570], ["1990-10-27T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1991-03-02T16:29:59+00:00", "02:59:59", "ACDT", -630], ["1991-03-02T16:30:00+00:00", "02:00:00", "ACST", -570], ["1991-10-26T16:29:59+00:00", "01:59:59", "ACST", -570], ["1991-10-26T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1992-03-21T16:29:59+00:00", "02:59:59", "ACDT", -630], ["1992-03-21T16:30:00+00:00", "02:00:00", "ACST", -570], ["1992-10-24T16:29:59+00:00", "01:59:59", "ACST", -570], ["1992-10-24T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1993-03-06T16:29:59+00:00", "02:59:59", "ACDT", -630], ["1993-03-06T16:30:00+00:00", "02:00:00", "ACST", -570], ["1993-10-30T16:29:59+00:00", "01:59:59", "ACST", -570], ["1993-10-30T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1994-03-19T16:29:59+00:00", "02:59:59", "ACDT", -630], ["1994-03-19T16:30:00+00:00", "02:00:00", "ACST", -570], ["1994-10-29T16:29:59+00:00", "01:59:59", "ACST", -570], ["1994-10-29T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1995-03-25T16:29:59+00:00", "02:59:59", "ACDT", -630], ["1995-03-25T16:30:00+00:00", "02:00:00", "ACST", -570], ["1995-10-28T16:29:59+00:00", "01:59:59", "ACST", -570], ["1995-10-28T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1996-03-30T16:29:59+00:00", "02:59:59", "ACDT", -630], ["1996-03-30T16:30:00+00:00", "02:00:00", "ACST", -570], ["1996-10-26T16:29:59+00:00", "01:59:59", "ACST", -570], ["1996-10-26T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1997-03-29T16:29:59+00:00", "02:59:59", "ACDT", -630], ["1997-03-29T16:30:00+00:00", "02:00:00", "ACST", -570], ["1997-10-25T16:29:59+00:00", "01:59:59", "ACST", -570], ["1997-10-25T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1998-03-28T16:29:59+00:00", "02:59:59", "ACDT", -630], ["1998-03-28T16:30:00+00:00", "02:00:00", "ACST", -570], ["1998-10-24T16:29:59+00:00", "01:59:59", "ACST", -570], ["1998-10-24T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["1999-03-27T16:29:59+00:00", "02:59:59", "ACDT", -630], ["1999-03-27T16:30:00+00:00", "02:00:00", "ACST", -570], ["1999-10-30T16:29:59+00:00", "01:59:59", "ACST", -570], ["1999-10-30T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2000-03-25T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2000-03-25T16:30:00+00:00", "02:00:00", "ACST", -570], ["2000-10-28T16:29:59+00:00", "01:59:59", "ACST", -570], ["2000-10-28T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2001-03-24T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2001-03-24T16:30:00+00:00", "02:00:00", "ACST", -570], ["2001-10-27T16:29:59+00:00", "01:59:59", "ACST", -570], ["2001-10-27T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2002-03-30T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2002-03-30T16:30:00+00:00", "02:00:00", "ACST", -570], ["2002-10-26T16:29:59+00:00", "01:59:59", "ACST", -570], ["2002-10-26T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2003-03-29T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2003-03-29T16:30:00+00:00", "02:00:00", "ACST", -570], ["2003-10-25T16:29:59+00:00", "01:59:59", "ACST", -570], ["2003-10-25T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2004-03-27T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2004-03-27T16:30:00+00:00", "02:00:00", "ACST", -570], ["2004-10-30T16:29:59+00:00", "01:59:59", "ACST", -570], ["2004-10-30T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2005-03-26T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2005-03-26T16:30:00+00:00", "02:00:00", "ACST", -570], ["2005-10-29T16:29:59+00:00", "01:59:59", "ACST", -570], ["2005-10-29T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2006-04-01T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2006-04-01T16:30:00+00:00", "02:00:00", "ACST", -570], ["2006-10-28T16:29:59+00:00", "01:59:59", "ACST", -570], ["2006-10-28T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2007-03-24T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2007-03-24T16:30:00+00:00", "02:00:00", "ACST", -570], ["2007-10-27T16:29:59+00:00", "01:59:59", "ACST", -570], ["2007-10-27T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2008-04-05T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2008-04-05T16:30:00+00:00", "02:00:00", "ACST", -570], ["2008-10-04T16:29:59+00:00", "01:59:59", "ACST", -570], ["2008-10-04T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2009-04-04T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2009-04-04T16:30:00+00:00", "02:00:00", "ACST", -570], ["2009-10-03T16:29:59+00:00", "01:59:59", "ACST", -570], ["2009-10-03T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2010-04-03T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2010-04-03T16:30:00+00:00", "02:00:00", "ACST", -570], ["2010-10-02T16:29:59+00:00", "01:59:59", "ACST", -570], ["2010-10-02T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2011-04-02T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2011-04-02T16:30:00+00:00", "02:00:00", "ACST", -570], ["2011-10-01T16:29:59+00:00", "01:59:59", "ACST", -570], ["2011-10-01T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2012-03-31T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2012-03-31T16:30:00+00:00", "02:00:00", "ACST", -570], ["2012-10-06T16:29:59+00:00", "01:59:59", "ACST", -570], ["2012-10-06T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2013-04-06T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2013-04-06T16:30:00+00:00", "02:00:00", "ACST", -570], ["2013-10-05T16:29:59+00:00", "01:59:59", "ACST", -570], ["2013-10-05T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2014-04-05T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2014-04-05T16:30:00+00:00", "02:00:00", "ACST", -570], ["2014-10-04T16:29:59+00:00", "01:59:59", "ACST", -570], ["2014-10-04T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2015-04-04T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2015-04-04T16:30:00+00:00", "02:00:00", "ACST", -570], ["2015-10-03T16:29:59+00:00", "01:59:59", "ACST", -570], ["2015-10-03T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2016-04-02T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2016-04-02T16:30:00+00:00", "02:00:00", "ACST", -570], ["2016-10-01T16:29:59+00:00", "01:59:59", "ACST", -570], ["2016-10-01T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2017-04-01T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2017-04-01T16:30:00+00:00", "02:00:00", "ACST", -570], ["2017-09-30T16:29:59+00:00", "01:59:59", "ACST", -570], ["2017-09-30T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2018-03-31T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2018-03-31T16:30:00+00:00", "02:00:00", "ACST", -570], ["2018-10-06T16:29:59+00:00", "01:59:59", "ACST", -570], ["2018-10-06T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2019-04-06T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2019-04-06T16:30:00+00:00", "02:00:00", "ACST", -570], ["2019-10-05T16:29:59+00:00", "01:59:59", "ACST", -570], ["2019-10-05T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2020-04-04T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2020-04-04T16:30:00+00:00", "02:00:00", "ACST", -570], ["2020-10-03T16:29:59+00:00", "01:59:59", "ACST", -570], ["2020-10-03T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2021-04-03T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2021-04-03T16:30:00+00:00", "02:00:00", "ACST", -570], ["2021-10-02T16:29:59+00:00", "01:59:59", "ACST", -570], ["2021-10-02T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2022-04-02T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2022-04-02T16:30:00+00:00", "02:00:00", "ACST", -570], ["2022-10-01T16:29:59+00:00", "01:59:59", "ACST", -570], ["2022-10-01T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2023-04-01T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2023-04-01T16:30:00+00:00", "02:00:00", "ACST", -570], ["2023-09-30T16:29:59+00:00", "01:59:59", "ACST", -570], ["2023-09-30T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2024-04-06T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2024-04-06T16:30:00+00:00", "02:00:00", "ACST", -570], ["2024-10-05T16:29:59+00:00", "01:59:59", "ACST", -570], ["2024-10-05T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2025-04-05T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2025-04-05T16:30:00+00:00", "02:00:00", "ACST", -570], ["2025-10-04T16:29:59+00:00", "01:59:59", "ACST", -570], ["2025-10-04T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2026-04-04T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2026-04-04T16:30:00+00:00", "02:00:00", "ACST", -570], ["2026-10-03T16:29:59+00:00", "01:59:59", "ACST", -570], ["2026-10-03T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2027-04-03T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2027-04-03T16:30:00+00:00", "02:00:00", "ACST", -570], ["2027-10-02T16:29:59+00:00", "01:59:59", "ACST", -570], ["2027-10-02T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2028-04-01T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2028-04-01T16:30:00+00:00", "02:00:00", "ACST", -570], ["2028-09-30T16:29:59+00:00", "01:59:59", "ACST", -570], ["2028-09-30T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2029-03-31T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2029-03-31T16:30:00+00:00", "02:00:00", "ACST", -570], ["2029-10-06T16:29:59+00:00", "01:59:59", "ACST", -570], ["2029-10-06T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2030-04-06T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2030-04-06T16:30:00+00:00", "02:00:00", "ACST", -570], ["2030-10-05T16:29:59+00:00", "01:59:59", "ACST", -570], ["2030-10-05T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2031-04-05T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2031-04-05T16:30:00+00:00", "02:00:00", "ACST", -570], ["2031-10-04T16:29:59+00:00", "01:59:59", "ACST", -570], ["2031-10-04T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2032-04-03T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2032-04-03T16:30:00+00:00", "02:00:00", "ACST", -570], ["2032-10-02T16:29:59+00:00", "01:59:59", "ACST", -570], ["2032-10-02T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2033-04-02T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2033-04-02T16:30:00+00:00", "02:00:00", "ACST", -570], ["2033-10-01T16:29:59+00:00", "01:59:59", "ACST", -570], ["2033-10-01T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2034-04-01T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2034-04-01T16:30:00+00:00", "02:00:00", "ACST", -570], ["2034-09-30T16:29:59+00:00", "01:59:59", "ACST", -570], ["2034-09-30T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2035-03-31T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2035-03-31T16:30:00+00:00", "02:00:00", "ACST", -570], ["2035-10-06T16:29:59+00:00", "01:59:59", "ACST", -570], ["2035-10-06T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2036-04-05T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2036-04-05T16:30:00+00:00", "02:00:00", "ACST", -570], ["2036-10-04T16:29:59+00:00", "01:59:59", "ACST", -570], ["2036-10-04T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
        helpers.testYear("Australia/Adelaide", [["2037-04-04T16:29:59+00:00", "02:59:59", "ACDT", -630], ["2037-04-04T16:30:00+00:00", "02:00:00", "ACST", -570], ["2037-10-03T16:29:59+00:00", "01:59:59", "ACST", -570], ["2037-10-03T16:30:00+00:00", "03:00:00", "ACDT", -630]]);
    });
});
