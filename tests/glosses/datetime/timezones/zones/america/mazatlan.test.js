

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("America/Mazatlan", () => {
        helpers.testYear("America/Mazatlan", [["1922-01-01T06:59:59+00:00", "23:54:19", "LMT", 25540 / 60], ["1922-01-01T07:00:00+00:00", "00:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["1927-06-11T05:59:59+00:00", "22:59:59", "MST", 420], ["1927-06-11T06:00:00+00:00", "00:00:00", "CST", 360]]);
        helpers.testYear("America/Mazatlan", [["1930-11-15T05:59:59+00:00", "23:59:59", "CST", 360], ["1930-11-15T06:00:00+00:00", "23:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["1931-05-02T05:59:59+00:00", "22:59:59", "MST", 420], ["1931-05-02T06:00:00+00:00", "00:00:00", "CST", 360], ["1931-10-01T05:59:59+00:00", "23:59:59", "CST", 360], ["1931-10-01T06:00:00+00:00", "23:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["1932-04-01T06:59:59+00:00", "23:59:59", "MST", 420], ["1932-04-01T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("America/Mazatlan", [["1942-04-24T05:59:59+00:00", "23:59:59", "CST", 360], ["1942-04-24T06:00:00+00:00", "23:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["1949-01-14T06:59:59+00:00", "23:59:59", "MST", 420], ["1949-01-14T07:00:00+00:00", "23:00:00", "PST", 480]]);
        helpers.testYear("America/Mazatlan", [["1970-01-01T07:59:59+00:00", "23:59:59", "PST", 480], ["1970-01-01T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["1996-04-07T08:59:59+00:00", "01:59:59", "MST", 420], ["1996-04-07T09:00:00+00:00", "03:00:00", "MDT", 360], ["1996-10-27T07:59:59+00:00", "01:59:59", "MDT", 360], ["1996-10-27T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["1997-04-06T08:59:59+00:00", "01:59:59", "MST", 420], ["1997-04-06T09:00:00+00:00", "03:00:00", "MDT", 360], ["1997-10-26T07:59:59+00:00", "01:59:59", "MDT", 360], ["1997-10-26T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["1998-04-05T08:59:59+00:00", "01:59:59", "MST", 420], ["1998-04-05T09:00:00+00:00", "03:00:00", "MDT", 360], ["1998-10-25T07:59:59+00:00", "01:59:59", "MDT", 360], ["1998-10-25T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["1999-04-04T08:59:59+00:00", "01:59:59", "MST", 420], ["1999-04-04T09:00:00+00:00", "03:00:00", "MDT", 360], ["1999-10-31T07:59:59+00:00", "01:59:59", "MDT", 360], ["1999-10-31T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2000-04-02T08:59:59+00:00", "01:59:59", "MST", 420], ["2000-04-02T09:00:00+00:00", "03:00:00", "MDT", 360], ["2000-10-29T07:59:59+00:00", "01:59:59", "MDT", 360], ["2000-10-29T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2001-05-06T08:59:59+00:00", "01:59:59", "MST", 420], ["2001-05-06T09:00:00+00:00", "03:00:00", "MDT", 360], ["2001-09-30T07:59:59+00:00", "01:59:59", "MDT", 360], ["2001-09-30T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2002-04-07T08:59:59+00:00", "01:59:59", "MST", 420], ["2002-04-07T09:00:00+00:00", "03:00:00", "MDT", 360], ["2002-10-27T07:59:59+00:00", "01:59:59", "MDT", 360], ["2002-10-27T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2003-04-06T08:59:59+00:00", "01:59:59", "MST", 420], ["2003-04-06T09:00:00+00:00", "03:00:00", "MDT", 360], ["2003-10-26T07:59:59+00:00", "01:59:59", "MDT", 360], ["2003-10-26T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2004-04-04T08:59:59+00:00", "01:59:59", "MST", 420], ["2004-04-04T09:00:00+00:00", "03:00:00", "MDT", 360], ["2004-10-31T07:59:59+00:00", "01:59:59", "MDT", 360], ["2004-10-31T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2005-04-03T08:59:59+00:00", "01:59:59", "MST", 420], ["2005-04-03T09:00:00+00:00", "03:00:00", "MDT", 360], ["2005-10-30T07:59:59+00:00", "01:59:59", "MDT", 360], ["2005-10-30T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2006-04-02T08:59:59+00:00", "01:59:59", "MST", 420], ["2006-04-02T09:00:00+00:00", "03:00:00", "MDT", 360], ["2006-10-29T07:59:59+00:00", "01:59:59", "MDT", 360], ["2006-10-29T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2007-04-01T08:59:59+00:00", "01:59:59", "MST", 420], ["2007-04-01T09:00:00+00:00", "03:00:00", "MDT", 360], ["2007-10-28T07:59:59+00:00", "01:59:59", "MDT", 360], ["2007-10-28T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2008-04-06T08:59:59+00:00", "01:59:59", "MST", 420], ["2008-04-06T09:00:00+00:00", "03:00:00", "MDT", 360], ["2008-10-26T07:59:59+00:00", "01:59:59", "MDT", 360], ["2008-10-26T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2009-04-05T08:59:59+00:00", "01:59:59", "MST", 420], ["2009-04-05T09:00:00+00:00", "03:00:00", "MDT", 360], ["2009-10-25T07:59:59+00:00", "01:59:59", "MDT", 360], ["2009-10-25T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2010-04-04T08:59:59+00:00", "01:59:59", "MST", 420], ["2010-04-04T09:00:00+00:00", "03:00:00", "MDT", 360], ["2010-10-31T07:59:59+00:00", "01:59:59", "MDT", 360], ["2010-10-31T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2011-04-03T08:59:59+00:00", "01:59:59", "MST", 420], ["2011-04-03T09:00:00+00:00", "03:00:00", "MDT", 360], ["2011-10-30T07:59:59+00:00", "01:59:59", "MDT", 360], ["2011-10-30T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2012-04-01T08:59:59+00:00", "01:59:59", "MST", 420], ["2012-04-01T09:00:00+00:00", "03:00:00", "MDT", 360], ["2012-10-28T07:59:59+00:00", "01:59:59", "MDT", 360], ["2012-10-28T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2013-04-07T08:59:59+00:00", "01:59:59", "MST", 420], ["2013-04-07T09:00:00+00:00", "03:00:00", "MDT", 360], ["2013-10-27T07:59:59+00:00", "01:59:59", "MDT", 360], ["2013-10-27T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2014-04-06T08:59:59+00:00", "01:59:59", "MST", 420], ["2014-04-06T09:00:00+00:00", "03:00:00", "MDT", 360], ["2014-10-26T07:59:59+00:00", "01:59:59", "MDT", 360], ["2014-10-26T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2015-04-05T08:59:59+00:00", "01:59:59", "MST", 420], ["2015-04-05T09:00:00+00:00", "03:00:00", "MDT", 360], ["2015-10-25T07:59:59+00:00", "01:59:59", "MDT", 360], ["2015-10-25T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2016-04-03T08:59:59+00:00", "01:59:59", "MST", 420], ["2016-04-03T09:00:00+00:00", "03:00:00", "MDT", 360], ["2016-10-30T07:59:59+00:00", "01:59:59", "MDT", 360], ["2016-10-30T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2017-04-02T08:59:59+00:00", "01:59:59", "MST", 420], ["2017-04-02T09:00:00+00:00", "03:00:00", "MDT", 360], ["2017-10-29T07:59:59+00:00", "01:59:59", "MDT", 360], ["2017-10-29T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2018-04-01T08:59:59+00:00", "01:59:59", "MST", 420], ["2018-04-01T09:00:00+00:00", "03:00:00", "MDT", 360], ["2018-10-28T07:59:59+00:00", "01:59:59", "MDT", 360], ["2018-10-28T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2019-04-07T08:59:59+00:00", "01:59:59", "MST", 420], ["2019-04-07T09:00:00+00:00", "03:00:00", "MDT", 360], ["2019-10-27T07:59:59+00:00", "01:59:59", "MDT", 360], ["2019-10-27T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2020-04-05T08:59:59+00:00", "01:59:59", "MST", 420], ["2020-04-05T09:00:00+00:00", "03:00:00", "MDT", 360], ["2020-10-25T07:59:59+00:00", "01:59:59", "MDT", 360], ["2020-10-25T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2021-04-04T08:59:59+00:00", "01:59:59", "MST", 420], ["2021-04-04T09:00:00+00:00", "03:00:00", "MDT", 360], ["2021-10-31T07:59:59+00:00", "01:59:59", "MDT", 360], ["2021-10-31T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2022-04-03T08:59:59+00:00", "01:59:59", "MST", 420], ["2022-04-03T09:00:00+00:00", "03:00:00", "MDT", 360], ["2022-10-30T07:59:59+00:00", "01:59:59", "MDT", 360], ["2022-10-30T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2023-04-02T08:59:59+00:00", "01:59:59", "MST", 420], ["2023-04-02T09:00:00+00:00", "03:00:00", "MDT", 360], ["2023-10-29T07:59:59+00:00", "01:59:59", "MDT", 360], ["2023-10-29T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2024-04-07T08:59:59+00:00", "01:59:59", "MST", 420], ["2024-04-07T09:00:00+00:00", "03:00:00", "MDT", 360], ["2024-10-27T07:59:59+00:00", "01:59:59", "MDT", 360], ["2024-10-27T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2025-04-06T08:59:59+00:00", "01:59:59", "MST", 420], ["2025-04-06T09:00:00+00:00", "03:00:00", "MDT", 360], ["2025-10-26T07:59:59+00:00", "01:59:59", "MDT", 360], ["2025-10-26T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2026-04-05T08:59:59+00:00", "01:59:59", "MST", 420], ["2026-04-05T09:00:00+00:00", "03:00:00", "MDT", 360], ["2026-10-25T07:59:59+00:00", "01:59:59", "MDT", 360], ["2026-10-25T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2027-04-04T08:59:59+00:00", "01:59:59", "MST", 420], ["2027-04-04T09:00:00+00:00", "03:00:00", "MDT", 360], ["2027-10-31T07:59:59+00:00", "01:59:59", "MDT", 360], ["2027-10-31T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2028-04-02T08:59:59+00:00", "01:59:59", "MST", 420], ["2028-04-02T09:00:00+00:00", "03:00:00", "MDT", 360], ["2028-10-29T07:59:59+00:00", "01:59:59", "MDT", 360], ["2028-10-29T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2029-04-01T08:59:59+00:00", "01:59:59", "MST", 420], ["2029-04-01T09:00:00+00:00", "03:00:00", "MDT", 360], ["2029-10-28T07:59:59+00:00", "01:59:59", "MDT", 360], ["2029-10-28T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2030-04-07T08:59:59+00:00", "01:59:59", "MST", 420], ["2030-04-07T09:00:00+00:00", "03:00:00", "MDT", 360], ["2030-10-27T07:59:59+00:00", "01:59:59", "MDT", 360], ["2030-10-27T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2031-04-06T08:59:59+00:00", "01:59:59", "MST", 420], ["2031-04-06T09:00:00+00:00", "03:00:00", "MDT", 360], ["2031-10-26T07:59:59+00:00", "01:59:59", "MDT", 360], ["2031-10-26T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2032-04-04T08:59:59+00:00", "01:59:59", "MST", 420], ["2032-04-04T09:00:00+00:00", "03:00:00", "MDT", 360], ["2032-10-31T07:59:59+00:00", "01:59:59", "MDT", 360], ["2032-10-31T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2033-04-03T08:59:59+00:00", "01:59:59", "MST", 420], ["2033-04-03T09:00:00+00:00", "03:00:00", "MDT", 360], ["2033-10-30T07:59:59+00:00", "01:59:59", "MDT", 360], ["2033-10-30T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2034-04-02T08:59:59+00:00", "01:59:59", "MST", 420], ["2034-04-02T09:00:00+00:00", "03:00:00", "MDT", 360], ["2034-10-29T07:59:59+00:00", "01:59:59", "MDT", 360], ["2034-10-29T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2035-04-01T08:59:59+00:00", "01:59:59", "MST", 420], ["2035-04-01T09:00:00+00:00", "03:00:00", "MDT", 360], ["2035-10-28T07:59:59+00:00", "01:59:59", "MDT", 360], ["2035-10-28T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2036-04-06T08:59:59+00:00", "01:59:59", "MST", 420], ["2036-04-06T09:00:00+00:00", "03:00:00", "MDT", 360], ["2036-10-26T07:59:59+00:00", "01:59:59", "MDT", 360], ["2036-10-26T08:00:00+00:00", "01:00:00", "MST", 420]]);
        helpers.testYear("America/Mazatlan", [["2037-04-05T08:59:59+00:00", "01:59:59", "MST", 420], ["2037-04-05T09:00:00+00:00", "03:00:00", "MDT", 360], ["2037-10-25T07:59:59+00:00", "01:59:59", "MDT", 360], ["2037-10-25T08:00:00+00:00", "01:00:00", "MST", 420]]);
    });
});
