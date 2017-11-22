

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Pacific/Easter", () => {
        helpers.testYear("Pacific/Easter", [["1932-09-01T07:17:27+00:00", "23:59:59", "EMT", 26248 / 60], ["1932-09-01T07:17:28+00:00", "00:17:28", "-07", 420]]);
        helpers.testYear("Pacific/Easter", [["1968-11-03T03:59:59+00:00", "20:59:59", "-07", 420], ["1968-11-03T04:00:00+00:00", "22:00:00", "-06", 360]]);
        helpers.testYear("Pacific/Easter", [["1969-03-30T02:59:59+00:00", "20:59:59", "-06", 360], ["1969-03-30T03:00:00+00:00", "20:00:00", "-07", 420], ["1969-11-23T03:59:59+00:00", "20:59:59", "-07", 420], ["1969-11-23T04:00:00+00:00", "22:00:00", "-06", 360]]);
        helpers.testYear("Pacific/Easter", [["1970-03-29T02:59:59+00:00", "20:59:59", "-06", 360], ["1970-03-29T03:00:00+00:00", "20:00:00", "-07", 420], ["1970-10-11T03:59:59+00:00", "20:59:59", "-07", 420], ["1970-10-11T04:00:00+00:00", "22:00:00", "-06", 360]]);
        helpers.testYear("Pacific/Easter", [["1971-03-14T02:59:59+00:00", "20:59:59", "-06", 360], ["1971-03-14T03:00:00+00:00", "20:00:00", "-07", 420], ["1971-10-10T03:59:59+00:00", "20:59:59", "-07", 420], ["1971-10-10T04:00:00+00:00", "22:00:00", "-06", 360]]);
        helpers.testYear("Pacific/Easter", [["1972-03-12T02:59:59+00:00", "20:59:59", "-06", 360], ["1972-03-12T03:00:00+00:00", "20:00:00", "-07", 420], ["1972-10-15T03:59:59+00:00", "20:59:59", "-07", 420], ["1972-10-15T04:00:00+00:00", "22:00:00", "-06", 360]]);
        helpers.testYear("Pacific/Easter", [["1973-03-11T02:59:59+00:00", "20:59:59", "-06", 360], ["1973-03-11T03:00:00+00:00", "20:00:00", "-07", 420], ["1973-09-30T03:59:59+00:00", "20:59:59", "-07", 420], ["1973-09-30T04:00:00+00:00", "22:00:00", "-06", 360]]);
        helpers.testYear("Pacific/Easter", [["1974-03-10T02:59:59+00:00", "20:59:59", "-06", 360], ["1974-03-10T03:00:00+00:00", "20:00:00", "-07", 420], ["1974-10-13T03:59:59+00:00", "20:59:59", "-07", 420], ["1974-10-13T04:00:00+00:00", "22:00:00", "-06", 360]]);
        helpers.testYear("Pacific/Easter", [["1975-03-09T02:59:59+00:00", "20:59:59", "-06", 360], ["1975-03-09T03:00:00+00:00", "20:00:00", "-07", 420], ["1975-10-12T03:59:59+00:00", "20:59:59", "-07", 420], ["1975-10-12T04:00:00+00:00", "22:00:00", "-06", 360]]);
        helpers.testYear("Pacific/Easter", [["1976-03-14T02:59:59+00:00", "20:59:59", "-06", 360], ["1976-03-14T03:00:00+00:00", "20:00:00", "-07", 420], ["1976-10-10T03:59:59+00:00", "20:59:59", "-07", 420], ["1976-10-10T04:00:00+00:00", "22:00:00", "-06", 360]]);
        helpers.testYear("Pacific/Easter", [["1977-03-13T02:59:59+00:00", "20:59:59", "-06", 360], ["1977-03-13T03:00:00+00:00", "20:00:00", "-07", 420], ["1977-10-09T03:59:59+00:00", "20:59:59", "-07", 420], ["1977-10-09T04:00:00+00:00", "22:00:00", "-06", 360]]);
        helpers.testYear("Pacific/Easter", [["1978-03-12T02:59:59+00:00", "20:59:59", "-06", 360], ["1978-03-12T03:00:00+00:00", "20:00:00", "-07", 420], ["1978-10-15T03:59:59+00:00", "20:59:59", "-07", 420], ["1978-10-15T04:00:00+00:00", "22:00:00", "-06", 360]]);
        helpers.testYear("Pacific/Easter", [["1979-03-11T02:59:59+00:00", "20:59:59", "-06", 360], ["1979-03-11T03:00:00+00:00", "20:00:00", "-07", 420], ["1979-10-14T03:59:59+00:00", "20:59:59", "-07", 420], ["1979-10-14T04:00:00+00:00", "22:00:00", "-06", 360]]);
        helpers.testYear("Pacific/Easter", [["1980-03-09T02:59:59+00:00", "20:59:59", "-06", 360], ["1980-03-09T03:00:00+00:00", "20:00:00", "-07", 420], ["1980-10-12T03:59:59+00:00", "20:59:59", "-07", 420], ["1980-10-12T04:00:00+00:00", "22:00:00", "-06", 360]]);
        helpers.testYear("Pacific/Easter", [["1981-03-15T02:59:59+00:00", "20:59:59", "-06", 360], ["1981-03-15T03:00:00+00:00", "20:00:00", "-07", 420], ["1981-10-11T03:59:59+00:00", "20:59:59", "-07", 420], ["1981-10-11T04:00:00+00:00", "22:00:00", "-06", 360]]);
        helpers.testYear("Pacific/Easter", [["1982-03-14T02:59:59+00:00", "20:59:59", "-06", 360], ["1982-03-14T03:00:00+00:00", "21:00:00", "-06", 360], ["1982-10-10T03:59:59+00:00", "21:59:59", "-06", 360], ["1982-10-10T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["1983-03-13T02:59:59+00:00", "21:59:59", "-05", 300], ["1983-03-13T03:00:00+00:00", "21:00:00", "-06", 360], ["1983-10-09T03:59:59+00:00", "21:59:59", "-06", 360], ["1983-10-09T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["1984-03-11T02:59:59+00:00", "21:59:59", "-05", 300], ["1984-03-11T03:00:00+00:00", "21:00:00", "-06", 360], ["1984-10-14T03:59:59+00:00", "21:59:59", "-06", 360], ["1984-10-14T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["1985-03-10T02:59:59+00:00", "21:59:59", "-05", 300], ["1985-03-10T03:00:00+00:00", "21:00:00", "-06", 360], ["1985-10-13T03:59:59+00:00", "21:59:59", "-06", 360], ["1985-10-13T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["1986-03-09T02:59:59+00:00", "21:59:59", "-05", 300], ["1986-03-09T03:00:00+00:00", "21:00:00", "-06", 360], ["1986-10-12T03:59:59+00:00", "21:59:59", "-06", 360], ["1986-10-12T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["1987-04-12T02:59:59+00:00", "21:59:59", "-05", 300], ["1987-04-12T03:00:00+00:00", "21:00:00", "-06", 360], ["1987-10-11T03:59:59+00:00", "21:59:59", "-06", 360], ["1987-10-11T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["1988-03-13T02:59:59+00:00", "21:59:59", "-05", 300], ["1988-03-13T03:00:00+00:00", "21:00:00", "-06", 360], ["1988-10-09T03:59:59+00:00", "21:59:59", "-06", 360], ["1988-10-09T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["1989-03-12T02:59:59+00:00", "21:59:59", "-05", 300], ["1989-03-12T03:00:00+00:00", "21:00:00", "-06", 360], ["1989-10-15T03:59:59+00:00", "21:59:59", "-06", 360], ["1989-10-15T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["1990-03-11T02:59:59+00:00", "21:59:59", "-05", 300], ["1990-03-11T03:00:00+00:00", "21:00:00", "-06", 360], ["1990-09-16T03:59:59+00:00", "21:59:59", "-06", 360], ["1990-09-16T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["1991-03-10T02:59:59+00:00", "21:59:59", "-05", 300], ["1991-03-10T03:00:00+00:00", "21:00:00", "-06", 360], ["1991-10-13T03:59:59+00:00", "21:59:59", "-06", 360], ["1991-10-13T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["1992-03-15T02:59:59+00:00", "21:59:59", "-05", 300], ["1992-03-15T03:00:00+00:00", "21:00:00", "-06", 360], ["1992-10-11T03:59:59+00:00", "21:59:59", "-06", 360], ["1992-10-11T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["1993-03-14T02:59:59+00:00", "21:59:59", "-05", 300], ["1993-03-14T03:00:00+00:00", "21:00:00", "-06", 360], ["1993-10-10T03:59:59+00:00", "21:59:59", "-06", 360], ["1993-10-10T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["1994-03-13T02:59:59+00:00", "21:59:59", "-05", 300], ["1994-03-13T03:00:00+00:00", "21:00:00", "-06", 360], ["1994-10-09T03:59:59+00:00", "21:59:59", "-06", 360], ["1994-10-09T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["1995-03-12T02:59:59+00:00", "21:59:59", "-05", 300], ["1995-03-12T03:00:00+00:00", "21:00:00", "-06", 360], ["1995-10-15T03:59:59+00:00", "21:59:59", "-06", 360], ["1995-10-15T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["1996-03-10T02:59:59+00:00", "21:59:59", "-05", 300], ["1996-03-10T03:00:00+00:00", "21:00:00", "-06", 360], ["1996-10-13T03:59:59+00:00", "21:59:59", "-06", 360], ["1996-10-13T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["1997-03-30T02:59:59+00:00", "21:59:59", "-05", 300], ["1997-03-30T03:00:00+00:00", "21:00:00", "-06", 360], ["1997-10-12T03:59:59+00:00", "21:59:59", "-06", 360], ["1997-10-12T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["1998-03-15T02:59:59+00:00", "21:59:59", "-05", 300], ["1998-03-15T03:00:00+00:00", "21:00:00", "-06", 360], ["1998-09-27T03:59:59+00:00", "21:59:59", "-06", 360], ["1998-09-27T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["1999-04-04T02:59:59+00:00", "21:59:59", "-05", 300], ["1999-04-04T03:00:00+00:00", "21:00:00", "-06", 360], ["1999-10-10T03:59:59+00:00", "21:59:59", "-06", 360], ["1999-10-10T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2000-03-12T02:59:59+00:00", "21:59:59", "-05", 300], ["2000-03-12T03:00:00+00:00", "21:00:00", "-06", 360], ["2000-10-15T03:59:59+00:00", "21:59:59", "-06", 360], ["2000-10-15T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2001-03-11T02:59:59+00:00", "21:59:59", "-05", 300], ["2001-03-11T03:00:00+00:00", "21:00:00", "-06", 360], ["2001-10-14T03:59:59+00:00", "21:59:59", "-06", 360], ["2001-10-14T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2002-03-10T02:59:59+00:00", "21:59:59", "-05", 300], ["2002-03-10T03:00:00+00:00", "21:00:00", "-06", 360], ["2002-10-13T03:59:59+00:00", "21:59:59", "-06", 360], ["2002-10-13T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2003-03-09T02:59:59+00:00", "21:59:59", "-05", 300], ["2003-03-09T03:00:00+00:00", "21:00:00", "-06", 360], ["2003-10-12T03:59:59+00:00", "21:59:59", "-06", 360], ["2003-10-12T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2004-03-14T02:59:59+00:00", "21:59:59", "-05", 300], ["2004-03-14T03:00:00+00:00", "21:00:00", "-06", 360], ["2004-10-10T03:59:59+00:00", "21:59:59", "-06", 360], ["2004-10-10T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2005-03-13T02:59:59+00:00", "21:59:59", "-05", 300], ["2005-03-13T03:00:00+00:00", "21:00:00", "-06", 360], ["2005-10-09T03:59:59+00:00", "21:59:59", "-06", 360], ["2005-10-09T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2006-03-12T02:59:59+00:00", "21:59:59", "-05", 300], ["2006-03-12T03:00:00+00:00", "21:00:00", "-06", 360], ["2006-10-15T03:59:59+00:00", "21:59:59", "-06", 360], ["2006-10-15T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2007-03-11T02:59:59+00:00", "21:59:59", "-05", 300], ["2007-03-11T03:00:00+00:00", "21:00:00", "-06", 360], ["2007-10-14T03:59:59+00:00", "21:59:59", "-06", 360], ["2007-10-14T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2008-03-30T02:59:59+00:00", "21:59:59", "-05", 300], ["2008-03-30T03:00:00+00:00", "21:00:00", "-06", 360], ["2008-10-12T03:59:59+00:00", "21:59:59", "-06", 360], ["2008-10-12T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2009-03-15T02:59:59+00:00", "21:59:59", "-05", 300], ["2009-03-15T03:00:00+00:00", "21:00:00", "-06", 360], ["2009-10-11T03:59:59+00:00", "21:59:59", "-06", 360], ["2009-10-11T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2010-04-04T02:59:59+00:00", "21:59:59", "-05", 300], ["2010-04-04T03:00:00+00:00", "21:00:00", "-06", 360], ["2010-10-10T03:59:59+00:00", "21:59:59", "-06", 360], ["2010-10-10T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2011-05-08T02:59:59+00:00", "21:59:59", "-05", 300], ["2011-05-08T03:00:00+00:00", "21:00:00", "-06", 360], ["2011-08-21T03:59:59+00:00", "21:59:59", "-06", 360], ["2011-08-21T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2012-04-29T02:59:59+00:00", "21:59:59", "-05", 300], ["2012-04-29T03:00:00+00:00", "21:00:00", "-06", 360], ["2012-09-02T03:59:59+00:00", "21:59:59", "-06", 360], ["2012-09-02T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2013-04-28T02:59:59+00:00", "21:59:59", "-05", 300], ["2013-04-28T03:00:00+00:00", "21:00:00", "-06", 360], ["2013-09-08T03:59:59+00:00", "21:59:59", "-06", 360], ["2013-09-08T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2014-04-27T02:59:59+00:00", "21:59:59", "-05", 300], ["2014-04-27T03:00:00+00:00", "21:00:00", "-06", 360], ["2014-09-07T03:59:59+00:00", "21:59:59", "-06", 360], ["2014-09-07T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2016-05-15T02:59:59+00:00", "21:59:59", "-05", 300], ["2016-05-15T03:00:00+00:00", "21:00:00", "-06", 360], ["2016-08-14T03:59:59+00:00", "21:59:59", "-06", 360], ["2016-08-14T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2017-05-14T02:59:59+00:00", "21:59:59", "-05", 300], ["2017-05-14T03:00:00+00:00", "21:00:00", "-06", 360], ["2017-08-13T03:59:59+00:00", "21:59:59", "-06", 360], ["2017-08-13T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2018-05-13T02:59:59+00:00", "21:59:59", "-05", 300], ["2018-05-13T03:00:00+00:00", "21:00:00", "-06", 360], ["2018-08-12T03:59:59+00:00", "21:59:59", "-06", 360], ["2018-08-12T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2019-05-12T02:59:59+00:00", "21:59:59", "-05", 300], ["2019-05-12T03:00:00+00:00", "21:00:00", "-06", 360], ["2019-08-11T03:59:59+00:00", "21:59:59", "-06", 360], ["2019-08-11T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2020-05-10T02:59:59+00:00", "21:59:59", "-05", 300], ["2020-05-10T03:00:00+00:00", "21:00:00", "-06", 360], ["2020-08-09T03:59:59+00:00", "21:59:59", "-06", 360], ["2020-08-09T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2021-05-09T02:59:59+00:00", "21:59:59", "-05", 300], ["2021-05-09T03:00:00+00:00", "21:00:00", "-06", 360], ["2021-08-15T03:59:59+00:00", "21:59:59", "-06", 360], ["2021-08-15T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2022-05-15T02:59:59+00:00", "21:59:59", "-05", 300], ["2022-05-15T03:00:00+00:00", "21:00:00", "-06", 360], ["2022-08-14T03:59:59+00:00", "21:59:59", "-06", 360], ["2022-08-14T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2023-05-14T02:59:59+00:00", "21:59:59", "-05", 300], ["2023-05-14T03:00:00+00:00", "21:00:00", "-06", 360], ["2023-08-13T03:59:59+00:00", "21:59:59", "-06", 360], ["2023-08-13T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2024-05-12T02:59:59+00:00", "21:59:59", "-05", 300], ["2024-05-12T03:00:00+00:00", "21:00:00", "-06", 360], ["2024-08-11T03:59:59+00:00", "21:59:59", "-06", 360], ["2024-08-11T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2025-05-11T02:59:59+00:00", "21:59:59", "-05", 300], ["2025-05-11T03:00:00+00:00", "21:00:00", "-06", 360], ["2025-08-10T03:59:59+00:00", "21:59:59", "-06", 360], ["2025-08-10T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2026-05-10T02:59:59+00:00", "21:59:59", "-05", 300], ["2026-05-10T03:00:00+00:00", "21:00:00", "-06", 360], ["2026-08-09T03:59:59+00:00", "21:59:59", "-06", 360], ["2026-08-09T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2027-05-09T02:59:59+00:00", "21:59:59", "-05", 300], ["2027-05-09T03:00:00+00:00", "21:00:00", "-06", 360], ["2027-08-15T03:59:59+00:00", "21:59:59", "-06", 360], ["2027-08-15T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2028-05-14T02:59:59+00:00", "21:59:59", "-05", 300], ["2028-05-14T03:00:00+00:00", "21:00:00", "-06", 360], ["2028-08-13T03:59:59+00:00", "21:59:59", "-06", 360], ["2028-08-13T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2029-05-13T02:59:59+00:00", "21:59:59", "-05", 300], ["2029-05-13T03:00:00+00:00", "21:00:00", "-06", 360], ["2029-08-12T03:59:59+00:00", "21:59:59", "-06", 360], ["2029-08-12T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2030-05-12T02:59:59+00:00", "21:59:59", "-05", 300], ["2030-05-12T03:00:00+00:00", "21:00:00", "-06", 360], ["2030-08-11T03:59:59+00:00", "21:59:59", "-06", 360], ["2030-08-11T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2031-05-11T02:59:59+00:00", "21:59:59", "-05", 300], ["2031-05-11T03:00:00+00:00", "21:00:00", "-06", 360], ["2031-08-10T03:59:59+00:00", "21:59:59", "-06", 360], ["2031-08-10T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2032-05-09T02:59:59+00:00", "21:59:59", "-05", 300], ["2032-05-09T03:00:00+00:00", "21:00:00", "-06", 360], ["2032-08-15T03:59:59+00:00", "21:59:59", "-06", 360], ["2032-08-15T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2033-05-15T02:59:59+00:00", "21:59:59", "-05", 300], ["2033-05-15T03:00:00+00:00", "21:00:00", "-06", 360], ["2033-08-14T03:59:59+00:00", "21:59:59", "-06", 360], ["2033-08-14T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2034-05-14T02:59:59+00:00", "21:59:59", "-05", 300], ["2034-05-14T03:00:00+00:00", "21:00:00", "-06", 360], ["2034-08-13T03:59:59+00:00", "21:59:59", "-06", 360], ["2034-08-13T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2035-05-13T02:59:59+00:00", "21:59:59", "-05", 300], ["2035-05-13T03:00:00+00:00", "21:00:00", "-06", 360], ["2035-08-12T03:59:59+00:00", "21:59:59", "-06", 360], ["2035-08-12T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2036-05-11T02:59:59+00:00", "21:59:59", "-05", 300], ["2036-05-11T03:00:00+00:00", "21:00:00", "-06", 360], ["2036-08-10T03:59:59+00:00", "21:59:59", "-06", 360], ["2036-08-10T04:00:00+00:00", "23:00:00", "-05", 300]]);
        helpers.testYear("Pacific/Easter", [["2037-05-10T02:59:59+00:00", "21:59:59", "-05", 300], ["2037-05-10T03:00:00+00:00", "21:00:00", "-06", 360], ["2037-08-09T03:59:59+00:00", "21:59:59", "-06", 360], ["2037-08-09T04:00:00+00:00", "23:00:00", "-05", 300]]);
    });
});
