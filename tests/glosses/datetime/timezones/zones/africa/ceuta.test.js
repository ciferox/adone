

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Africa/Ceuta", () => {
        helpers.testYear("Africa/Ceuta", [["1918-05-06T22:59:59+00:00", "22:59:59", "WET", 0], ["1918-05-06T23:00:00+00:00", "00:00:00", "WEST", -60], ["1918-10-07T21:59:59+00:00", "22:59:59", "WEST", -60], ["1918-10-07T22:00:00+00:00", "22:00:00", "WET", 0]]);
        helpers.testYear("Africa/Ceuta", [["1924-04-16T22:59:59+00:00", "22:59:59", "WET", 0], ["1924-04-16T23:00:00+00:00", "00:00:00", "WEST", -60], ["1924-10-04T23:59:59+00:00", "00:59:59", "WEST", -60], ["1924-10-05T00:00:00+00:00", "00:00:00", "WET", 0]]);
        helpers.testYear("Africa/Ceuta", [["1926-04-17T22:59:59+00:00", "22:59:59", "WET", 0], ["1926-04-17T23:00:00+00:00", "00:00:00", "WEST", -60], ["1926-10-02T23:59:59+00:00", "00:59:59", "WEST", -60], ["1926-10-03T00:00:00+00:00", "00:00:00", "WET", 0]]);
        helpers.testYear("Africa/Ceuta", [["1927-04-09T22:59:59+00:00", "22:59:59", "WET", 0], ["1927-04-09T23:00:00+00:00", "00:00:00", "WEST", -60], ["1927-10-01T23:59:59+00:00", "00:59:59", "WEST", -60], ["1927-10-02T00:00:00+00:00", "00:00:00", "WET", 0]]);
        helpers.testYear("Africa/Ceuta", [["1928-04-14T23:59:59+00:00", "23:59:59", "WET", 0], ["1928-04-15T00:00:00+00:00", "01:00:00", "WEST", -60], ["1928-10-06T23:59:59+00:00", "00:59:59", "WEST", -60], ["1928-10-07T00:00:00+00:00", "00:00:00", "WET", 0]]);
        helpers.testYear("Africa/Ceuta", [["1967-06-03T11:59:59+00:00", "11:59:59", "WET", 0], ["1967-06-03T12:00:00+00:00", "13:00:00", "WEST", -60], ["1967-09-30T22:59:59+00:00", "23:59:59", "WEST", -60], ["1967-09-30T23:00:00+00:00", "23:00:00", "WET", 0]]);
        helpers.testYear("Africa/Ceuta", [["1974-06-23T23:59:59+00:00", "23:59:59", "WET", 0], ["1974-06-24T00:00:00+00:00", "01:00:00", "WEST", -60], ["1974-08-31T22:59:59+00:00", "23:59:59", "WEST", -60], ["1974-08-31T23:00:00+00:00", "23:00:00", "WET", 0]]);
        helpers.testYear("Africa/Ceuta", [["1976-04-30T23:59:59+00:00", "23:59:59", "WET", 0], ["1976-05-01T00:00:00+00:00", "01:00:00", "WEST", -60], ["1976-07-31T22:59:59+00:00", "23:59:59", "WEST", -60], ["1976-07-31T23:00:00+00:00", "23:00:00", "WET", 0]]);
        helpers.testYear("Africa/Ceuta", [["1977-04-30T23:59:59+00:00", "23:59:59", "WET", 0], ["1977-05-01T00:00:00+00:00", "01:00:00", "WEST", -60], ["1977-09-27T22:59:59+00:00", "23:59:59", "WEST", -60], ["1977-09-27T23:00:00+00:00", "23:00:00", "WET", 0]]);
        helpers.testYear("Africa/Ceuta", [["1978-05-31T23:59:59+00:00", "23:59:59", "WET", 0], ["1978-06-01T00:00:00+00:00", "01:00:00", "WEST", -60], ["1978-08-03T22:59:59+00:00", "23:59:59", "WEST", -60], ["1978-08-03T23:00:00+00:00", "23:00:00", "WET", 0]]);
        helpers.testYear("Africa/Ceuta", [["1984-03-15T23:59:59+00:00", "23:59:59", "WET", 0], ["1984-03-16T00:00:00+00:00", "01:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["1986-03-30T00:59:59+00:00", "01:59:59", "CET", -60], ["1986-03-30T01:00:00+00:00", "03:00:00", "CEST", -120], ["1986-09-28T00:59:59+00:00", "02:59:59", "CEST", -120], ["1986-09-28T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["1987-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["1987-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["1987-09-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["1987-09-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["1988-03-27T00:59:59+00:00", "01:59:59", "CET", -60], ["1988-03-27T01:00:00+00:00", "03:00:00", "CEST", -120], ["1988-09-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["1988-09-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["1989-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["1989-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["1989-09-24T00:59:59+00:00", "02:59:59", "CEST", -120], ["1989-09-24T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["1990-03-25T00:59:59+00:00", "01:59:59", "CET", -60], ["1990-03-25T01:00:00+00:00", "03:00:00", "CEST", -120], ["1990-09-30T00:59:59+00:00", "02:59:59", "CEST", -120], ["1990-09-30T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["1991-03-31T00:59:59+00:00", "01:59:59", "CET", -60], ["1991-03-31T01:00:00+00:00", "03:00:00", "CEST", -120], ["1991-09-29T00:59:59+00:00", "02:59:59", "CEST", -120], ["1991-09-29T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["1992-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["1992-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["1992-09-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["1992-09-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["1993-03-28T00:59:59+00:00", "01:59:59", "CET", -60], ["1993-03-28T01:00:00+00:00", "03:00:00", "CEST", -120], ["1993-09-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["1993-09-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["1994-03-27T00:59:59+00:00", "01:59:59", "CET", -60], ["1994-03-27T01:00:00+00:00", "03:00:00", "CEST", -120], ["1994-09-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["1994-09-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["1995-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["1995-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["1995-09-24T00:59:59+00:00", "02:59:59", "CEST", -120], ["1995-09-24T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["1996-03-31T00:59:59+00:00", "01:59:59", "CET", -60], ["1996-03-31T01:00:00+00:00", "03:00:00", "CEST", -120], ["1996-10-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["1996-10-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["1997-03-30T00:59:59+00:00", "01:59:59", "CET", -60], ["1997-03-30T01:00:00+00:00", "03:00:00", "CEST", -120], ["1997-10-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["1997-10-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["1998-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["1998-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["1998-10-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["1998-10-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["1999-03-28T00:59:59+00:00", "01:59:59", "CET", -60], ["1999-03-28T01:00:00+00:00", "03:00:00", "CEST", -120], ["1999-10-31T00:59:59+00:00", "02:59:59", "CEST", -120], ["1999-10-31T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2000-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["2000-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["2000-10-29T00:59:59+00:00", "02:59:59", "CEST", -120], ["2000-10-29T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2001-03-25T00:59:59+00:00", "01:59:59", "CET", -60], ["2001-03-25T01:00:00+00:00", "03:00:00", "CEST", -120], ["2001-10-28T00:59:59+00:00", "02:59:59", "CEST", -120], ["2001-10-28T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2002-03-31T00:59:59+00:00", "01:59:59", "CET", -60], ["2002-03-31T01:00:00+00:00", "03:00:00", "CEST", -120], ["2002-10-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["2002-10-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2003-03-30T00:59:59+00:00", "01:59:59", "CET", -60], ["2003-03-30T01:00:00+00:00", "03:00:00", "CEST", -120], ["2003-10-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["2003-10-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2004-03-28T00:59:59+00:00", "01:59:59", "CET", -60], ["2004-03-28T01:00:00+00:00", "03:00:00", "CEST", -120], ["2004-10-31T00:59:59+00:00", "02:59:59", "CEST", -120], ["2004-10-31T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2005-03-27T00:59:59+00:00", "01:59:59", "CET", -60], ["2005-03-27T01:00:00+00:00", "03:00:00", "CEST", -120], ["2005-10-30T00:59:59+00:00", "02:59:59", "CEST", -120], ["2005-10-30T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2006-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["2006-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["2006-10-29T00:59:59+00:00", "02:59:59", "CEST", -120], ["2006-10-29T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2007-03-25T00:59:59+00:00", "01:59:59", "CET", -60], ["2007-03-25T01:00:00+00:00", "03:00:00", "CEST", -120], ["2007-10-28T00:59:59+00:00", "02:59:59", "CEST", -120], ["2007-10-28T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2008-03-30T00:59:59+00:00", "01:59:59", "CET", -60], ["2008-03-30T01:00:00+00:00", "03:00:00", "CEST", -120], ["2008-10-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["2008-10-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2009-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["2009-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["2009-10-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["2009-10-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2010-03-28T00:59:59+00:00", "01:59:59", "CET", -60], ["2010-03-28T01:00:00+00:00", "03:00:00", "CEST", -120], ["2010-10-31T00:59:59+00:00", "02:59:59", "CEST", -120], ["2010-10-31T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2011-03-27T00:59:59+00:00", "01:59:59", "CET", -60], ["2011-03-27T01:00:00+00:00", "03:00:00", "CEST", -120], ["2011-10-30T00:59:59+00:00", "02:59:59", "CEST", -120], ["2011-10-30T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2012-03-25T00:59:59+00:00", "01:59:59", "CET", -60], ["2012-03-25T01:00:00+00:00", "03:00:00", "CEST", -120], ["2012-10-28T00:59:59+00:00", "02:59:59", "CEST", -120], ["2012-10-28T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2013-03-31T00:59:59+00:00", "01:59:59", "CET", -60], ["2013-03-31T01:00:00+00:00", "03:00:00", "CEST", -120], ["2013-10-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["2013-10-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2014-03-30T00:59:59+00:00", "01:59:59", "CET", -60], ["2014-03-30T01:00:00+00:00", "03:00:00", "CEST", -120], ["2014-10-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["2014-10-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2015-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["2015-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["2015-10-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["2015-10-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2016-03-27T00:59:59+00:00", "01:59:59", "CET", -60], ["2016-03-27T01:00:00+00:00", "03:00:00", "CEST", -120], ["2016-10-30T00:59:59+00:00", "02:59:59", "CEST", -120], ["2016-10-30T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2017-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["2017-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["2017-10-29T00:59:59+00:00", "02:59:59", "CEST", -120], ["2017-10-29T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2018-03-25T00:59:59+00:00", "01:59:59", "CET", -60], ["2018-03-25T01:00:00+00:00", "03:00:00", "CEST", -120], ["2018-10-28T00:59:59+00:00", "02:59:59", "CEST", -120], ["2018-10-28T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2019-03-31T00:59:59+00:00", "01:59:59", "CET", -60], ["2019-03-31T01:00:00+00:00", "03:00:00", "CEST", -120], ["2019-10-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["2019-10-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2020-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["2020-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["2020-10-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["2020-10-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2021-03-28T00:59:59+00:00", "01:59:59", "CET", -60], ["2021-03-28T01:00:00+00:00", "03:00:00", "CEST", -120], ["2021-10-31T00:59:59+00:00", "02:59:59", "CEST", -120], ["2021-10-31T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2022-03-27T00:59:59+00:00", "01:59:59", "CET", -60], ["2022-03-27T01:00:00+00:00", "03:00:00", "CEST", -120], ["2022-10-30T00:59:59+00:00", "02:59:59", "CEST", -120], ["2022-10-30T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2023-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["2023-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["2023-10-29T00:59:59+00:00", "02:59:59", "CEST", -120], ["2023-10-29T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2024-03-31T00:59:59+00:00", "01:59:59", "CET", -60], ["2024-03-31T01:00:00+00:00", "03:00:00", "CEST", -120], ["2024-10-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["2024-10-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2025-03-30T00:59:59+00:00", "01:59:59", "CET", -60], ["2025-03-30T01:00:00+00:00", "03:00:00", "CEST", -120], ["2025-10-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["2025-10-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2026-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["2026-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["2026-10-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["2026-10-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2027-03-28T00:59:59+00:00", "01:59:59", "CET", -60], ["2027-03-28T01:00:00+00:00", "03:00:00", "CEST", -120], ["2027-10-31T00:59:59+00:00", "02:59:59", "CEST", -120], ["2027-10-31T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2028-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["2028-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["2028-10-29T00:59:59+00:00", "02:59:59", "CEST", -120], ["2028-10-29T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2029-03-25T00:59:59+00:00", "01:59:59", "CET", -60], ["2029-03-25T01:00:00+00:00", "03:00:00", "CEST", -120], ["2029-10-28T00:59:59+00:00", "02:59:59", "CEST", -120], ["2029-10-28T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2030-03-31T00:59:59+00:00", "01:59:59", "CET", -60], ["2030-03-31T01:00:00+00:00", "03:00:00", "CEST", -120], ["2030-10-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["2030-10-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2031-03-30T00:59:59+00:00", "01:59:59", "CET", -60], ["2031-03-30T01:00:00+00:00", "03:00:00", "CEST", -120], ["2031-10-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["2031-10-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2032-03-28T00:59:59+00:00", "01:59:59", "CET", -60], ["2032-03-28T01:00:00+00:00", "03:00:00", "CEST", -120], ["2032-10-31T00:59:59+00:00", "02:59:59", "CEST", -120], ["2032-10-31T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2033-03-27T00:59:59+00:00", "01:59:59", "CET", -60], ["2033-03-27T01:00:00+00:00", "03:00:00", "CEST", -120], ["2033-10-30T00:59:59+00:00", "02:59:59", "CEST", -120], ["2033-10-30T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2034-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["2034-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["2034-10-29T00:59:59+00:00", "02:59:59", "CEST", -120], ["2034-10-29T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2035-03-25T00:59:59+00:00", "01:59:59", "CET", -60], ["2035-03-25T01:00:00+00:00", "03:00:00", "CEST", -120], ["2035-10-28T00:59:59+00:00", "02:59:59", "CEST", -120], ["2035-10-28T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2036-03-30T00:59:59+00:00", "01:59:59", "CET", -60], ["2036-03-30T01:00:00+00:00", "03:00:00", "CEST", -120], ["2036-10-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["2036-10-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Africa/Ceuta", [["2037-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["2037-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["2037-10-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["2037-10-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
    });
});
