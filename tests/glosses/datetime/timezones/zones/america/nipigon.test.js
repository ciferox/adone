

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("America/Nipigon", () => {
        helpers.testYear("America/Nipigon", [["1918-04-14T06:59:59+00:00", "01:59:59", "EST", 300], ["1918-04-14T07:00:00+00:00", "03:00:00", "EDT", 240], ["1918-10-27T05:59:59+00:00", "01:59:59", "EDT", 240], ["1918-10-27T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["1940-09-29T04:59:59+00:00", "23:59:59", "EST", 300], ["1940-09-29T05:00:00+00:00", "01:00:00", "EDT", 240]]);
        helpers.testYear("America/Nipigon", [["1942-02-09T06:59:59+00:00", "02:59:59", "EDT", 240], ["1942-02-09T07:00:00+00:00", "03:00:00", "EWT", 240]]);
        helpers.testYear("America/Nipigon", [["1945-08-14T22:59:59+00:00", "18:59:59", "EWT", 240], ["1945-08-14T23:00:00+00:00", "19:00:00", "EPT", 240], ["1945-09-30T05:59:59+00:00", "01:59:59", "EPT", 240], ["1945-09-30T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["1974-04-28T06:59:59+00:00", "01:59:59", "EST", 300], ["1974-04-28T07:00:00+00:00", "03:00:00", "EDT", 240], ["1974-10-27T05:59:59+00:00", "01:59:59", "EDT", 240], ["1974-10-27T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["1975-04-27T06:59:59+00:00", "01:59:59", "EST", 300], ["1975-04-27T07:00:00+00:00", "03:00:00", "EDT", 240], ["1975-10-26T05:59:59+00:00", "01:59:59", "EDT", 240], ["1975-10-26T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["1976-04-25T06:59:59+00:00", "01:59:59", "EST", 300], ["1976-04-25T07:00:00+00:00", "03:00:00", "EDT", 240], ["1976-10-31T05:59:59+00:00", "01:59:59", "EDT", 240], ["1976-10-31T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["1977-04-24T06:59:59+00:00", "01:59:59", "EST", 300], ["1977-04-24T07:00:00+00:00", "03:00:00", "EDT", 240], ["1977-10-30T05:59:59+00:00", "01:59:59", "EDT", 240], ["1977-10-30T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["1978-04-30T06:59:59+00:00", "01:59:59", "EST", 300], ["1978-04-30T07:00:00+00:00", "03:00:00", "EDT", 240], ["1978-10-29T05:59:59+00:00", "01:59:59", "EDT", 240], ["1978-10-29T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["1979-04-29T06:59:59+00:00", "01:59:59", "EST", 300], ["1979-04-29T07:00:00+00:00", "03:00:00", "EDT", 240], ["1979-10-28T05:59:59+00:00", "01:59:59", "EDT", 240], ["1979-10-28T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["1980-04-27T06:59:59+00:00", "01:59:59", "EST", 300], ["1980-04-27T07:00:00+00:00", "03:00:00", "EDT", 240], ["1980-10-26T05:59:59+00:00", "01:59:59", "EDT", 240], ["1980-10-26T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["1981-04-26T06:59:59+00:00", "01:59:59", "EST", 300], ["1981-04-26T07:00:00+00:00", "03:00:00", "EDT", 240], ["1981-10-25T05:59:59+00:00", "01:59:59", "EDT", 240], ["1981-10-25T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["1982-04-25T06:59:59+00:00", "01:59:59", "EST", 300], ["1982-04-25T07:00:00+00:00", "03:00:00", "EDT", 240], ["1982-10-31T05:59:59+00:00", "01:59:59", "EDT", 240], ["1982-10-31T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["1983-04-24T06:59:59+00:00", "01:59:59", "EST", 300], ["1983-04-24T07:00:00+00:00", "03:00:00", "EDT", 240], ["1983-10-30T05:59:59+00:00", "01:59:59", "EDT", 240], ["1983-10-30T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["1984-04-29T06:59:59+00:00", "01:59:59", "EST", 300], ["1984-04-29T07:00:00+00:00", "03:00:00", "EDT", 240], ["1984-10-28T05:59:59+00:00", "01:59:59", "EDT", 240], ["1984-10-28T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["1985-04-28T06:59:59+00:00", "01:59:59", "EST", 300], ["1985-04-28T07:00:00+00:00", "03:00:00", "EDT", 240], ["1985-10-27T05:59:59+00:00", "01:59:59", "EDT", 240], ["1985-10-27T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["1986-04-27T06:59:59+00:00", "01:59:59", "EST", 300], ["1986-04-27T07:00:00+00:00", "03:00:00", "EDT", 240], ["1986-10-26T05:59:59+00:00", "01:59:59", "EDT", 240], ["1986-10-26T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["1987-04-05T06:59:59+00:00", "01:59:59", "EST", 300], ["1987-04-05T07:00:00+00:00", "03:00:00", "EDT", 240], ["1987-10-25T05:59:59+00:00", "01:59:59", "EDT", 240], ["1987-10-25T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["1988-04-03T06:59:59+00:00", "01:59:59", "EST", 300], ["1988-04-03T07:00:00+00:00", "03:00:00", "EDT", 240], ["1988-10-30T05:59:59+00:00", "01:59:59", "EDT", 240], ["1988-10-30T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["1989-04-02T06:59:59+00:00", "01:59:59", "EST", 300], ["1989-04-02T07:00:00+00:00", "03:00:00", "EDT", 240], ["1989-10-29T05:59:59+00:00", "01:59:59", "EDT", 240], ["1989-10-29T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["1990-04-01T06:59:59+00:00", "01:59:59", "EST", 300], ["1990-04-01T07:00:00+00:00", "03:00:00", "EDT", 240], ["1990-10-28T05:59:59+00:00", "01:59:59", "EDT", 240], ["1990-10-28T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["1991-04-07T06:59:59+00:00", "01:59:59", "EST", 300], ["1991-04-07T07:00:00+00:00", "03:00:00", "EDT", 240], ["1991-10-27T05:59:59+00:00", "01:59:59", "EDT", 240], ["1991-10-27T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["1992-04-05T06:59:59+00:00", "01:59:59", "EST", 300], ["1992-04-05T07:00:00+00:00", "03:00:00", "EDT", 240], ["1992-10-25T05:59:59+00:00", "01:59:59", "EDT", 240], ["1992-10-25T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["1993-04-04T06:59:59+00:00", "01:59:59", "EST", 300], ["1993-04-04T07:00:00+00:00", "03:00:00", "EDT", 240], ["1993-10-31T05:59:59+00:00", "01:59:59", "EDT", 240], ["1993-10-31T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["1994-04-03T06:59:59+00:00", "01:59:59", "EST", 300], ["1994-04-03T07:00:00+00:00", "03:00:00", "EDT", 240], ["1994-10-30T05:59:59+00:00", "01:59:59", "EDT", 240], ["1994-10-30T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["1995-04-02T06:59:59+00:00", "01:59:59", "EST", 300], ["1995-04-02T07:00:00+00:00", "03:00:00", "EDT", 240], ["1995-10-29T05:59:59+00:00", "01:59:59", "EDT", 240], ["1995-10-29T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["1996-04-07T06:59:59+00:00", "01:59:59", "EST", 300], ["1996-04-07T07:00:00+00:00", "03:00:00", "EDT", 240], ["1996-10-27T05:59:59+00:00", "01:59:59", "EDT", 240], ["1996-10-27T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["1997-04-06T06:59:59+00:00", "01:59:59", "EST", 300], ["1997-04-06T07:00:00+00:00", "03:00:00", "EDT", 240], ["1997-10-26T05:59:59+00:00", "01:59:59", "EDT", 240], ["1997-10-26T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["1998-04-05T06:59:59+00:00", "01:59:59", "EST", 300], ["1998-04-05T07:00:00+00:00", "03:00:00", "EDT", 240], ["1998-10-25T05:59:59+00:00", "01:59:59", "EDT", 240], ["1998-10-25T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["1999-04-04T06:59:59+00:00", "01:59:59", "EST", 300], ["1999-04-04T07:00:00+00:00", "03:00:00", "EDT", 240], ["1999-10-31T05:59:59+00:00", "01:59:59", "EDT", 240], ["1999-10-31T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2000-04-02T06:59:59+00:00", "01:59:59", "EST", 300], ["2000-04-02T07:00:00+00:00", "03:00:00", "EDT", 240], ["2000-10-29T05:59:59+00:00", "01:59:59", "EDT", 240], ["2000-10-29T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2001-04-01T06:59:59+00:00", "01:59:59", "EST", 300], ["2001-04-01T07:00:00+00:00", "03:00:00", "EDT", 240], ["2001-10-28T05:59:59+00:00", "01:59:59", "EDT", 240], ["2001-10-28T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2002-04-07T06:59:59+00:00", "01:59:59", "EST", 300], ["2002-04-07T07:00:00+00:00", "03:00:00", "EDT", 240], ["2002-10-27T05:59:59+00:00", "01:59:59", "EDT", 240], ["2002-10-27T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2003-04-06T06:59:59+00:00", "01:59:59", "EST", 300], ["2003-04-06T07:00:00+00:00", "03:00:00", "EDT", 240], ["2003-10-26T05:59:59+00:00", "01:59:59", "EDT", 240], ["2003-10-26T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2004-04-04T06:59:59+00:00", "01:59:59", "EST", 300], ["2004-04-04T07:00:00+00:00", "03:00:00", "EDT", 240], ["2004-10-31T05:59:59+00:00", "01:59:59", "EDT", 240], ["2004-10-31T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2005-04-03T06:59:59+00:00", "01:59:59", "EST", 300], ["2005-04-03T07:00:00+00:00", "03:00:00", "EDT", 240], ["2005-10-30T05:59:59+00:00", "01:59:59", "EDT", 240], ["2005-10-30T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2006-04-02T06:59:59+00:00", "01:59:59", "EST", 300], ["2006-04-02T07:00:00+00:00", "03:00:00", "EDT", 240], ["2006-10-29T05:59:59+00:00", "01:59:59", "EDT", 240], ["2006-10-29T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2007-03-11T06:59:59+00:00", "01:59:59", "EST", 300], ["2007-03-11T07:00:00+00:00", "03:00:00", "EDT", 240], ["2007-11-04T05:59:59+00:00", "01:59:59", "EDT", 240], ["2007-11-04T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2008-03-09T06:59:59+00:00", "01:59:59", "EST", 300], ["2008-03-09T07:00:00+00:00", "03:00:00", "EDT", 240], ["2008-11-02T05:59:59+00:00", "01:59:59", "EDT", 240], ["2008-11-02T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2009-03-08T06:59:59+00:00", "01:59:59", "EST", 300], ["2009-03-08T07:00:00+00:00", "03:00:00", "EDT", 240], ["2009-11-01T05:59:59+00:00", "01:59:59", "EDT", 240], ["2009-11-01T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2010-03-14T06:59:59+00:00", "01:59:59", "EST", 300], ["2010-03-14T07:00:00+00:00", "03:00:00", "EDT", 240], ["2010-11-07T05:59:59+00:00", "01:59:59", "EDT", 240], ["2010-11-07T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2011-03-13T06:59:59+00:00", "01:59:59", "EST", 300], ["2011-03-13T07:00:00+00:00", "03:00:00", "EDT", 240], ["2011-11-06T05:59:59+00:00", "01:59:59", "EDT", 240], ["2011-11-06T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2012-03-11T06:59:59+00:00", "01:59:59", "EST", 300], ["2012-03-11T07:00:00+00:00", "03:00:00", "EDT", 240], ["2012-11-04T05:59:59+00:00", "01:59:59", "EDT", 240], ["2012-11-04T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2013-03-10T06:59:59+00:00", "01:59:59", "EST", 300], ["2013-03-10T07:00:00+00:00", "03:00:00", "EDT", 240], ["2013-11-03T05:59:59+00:00", "01:59:59", "EDT", 240], ["2013-11-03T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2014-03-09T06:59:59+00:00", "01:59:59", "EST", 300], ["2014-03-09T07:00:00+00:00", "03:00:00", "EDT", 240], ["2014-11-02T05:59:59+00:00", "01:59:59", "EDT", 240], ["2014-11-02T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2015-03-08T06:59:59+00:00", "01:59:59", "EST", 300], ["2015-03-08T07:00:00+00:00", "03:00:00", "EDT", 240], ["2015-11-01T05:59:59+00:00", "01:59:59", "EDT", 240], ["2015-11-01T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2016-03-13T06:59:59+00:00", "01:59:59", "EST", 300], ["2016-03-13T07:00:00+00:00", "03:00:00", "EDT", 240], ["2016-11-06T05:59:59+00:00", "01:59:59", "EDT", 240], ["2016-11-06T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2017-03-12T06:59:59+00:00", "01:59:59", "EST", 300], ["2017-03-12T07:00:00+00:00", "03:00:00", "EDT", 240], ["2017-11-05T05:59:59+00:00", "01:59:59", "EDT", 240], ["2017-11-05T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2018-03-11T06:59:59+00:00", "01:59:59", "EST", 300], ["2018-03-11T07:00:00+00:00", "03:00:00", "EDT", 240], ["2018-11-04T05:59:59+00:00", "01:59:59", "EDT", 240], ["2018-11-04T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2019-03-10T06:59:59+00:00", "01:59:59", "EST", 300], ["2019-03-10T07:00:00+00:00", "03:00:00", "EDT", 240], ["2019-11-03T05:59:59+00:00", "01:59:59", "EDT", 240], ["2019-11-03T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2020-03-08T06:59:59+00:00", "01:59:59", "EST", 300], ["2020-03-08T07:00:00+00:00", "03:00:00", "EDT", 240], ["2020-11-01T05:59:59+00:00", "01:59:59", "EDT", 240], ["2020-11-01T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2021-03-14T06:59:59+00:00", "01:59:59", "EST", 300], ["2021-03-14T07:00:00+00:00", "03:00:00", "EDT", 240], ["2021-11-07T05:59:59+00:00", "01:59:59", "EDT", 240], ["2021-11-07T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2022-03-13T06:59:59+00:00", "01:59:59", "EST", 300], ["2022-03-13T07:00:00+00:00", "03:00:00", "EDT", 240], ["2022-11-06T05:59:59+00:00", "01:59:59", "EDT", 240], ["2022-11-06T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2023-03-12T06:59:59+00:00", "01:59:59", "EST", 300], ["2023-03-12T07:00:00+00:00", "03:00:00", "EDT", 240], ["2023-11-05T05:59:59+00:00", "01:59:59", "EDT", 240], ["2023-11-05T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2024-03-10T06:59:59+00:00", "01:59:59", "EST", 300], ["2024-03-10T07:00:00+00:00", "03:00:00", "EDT", 240], ["2024-11-03T05:59:59+00:00", "01:59:59", "EDT", 240], ["2024-11-03T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2025-03-09T06:59:59+00:00", "01:59:59", "EST", 300], ["2025-03-09T07:00:00+00:00", "03:00:00", "EDT", 240], ["2025-11-02T05:59:59+00:00", "01:59:59", "EDT", 240], ["2025-11-02T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2026-03-08T06:59:59+00:00", "01:59:59", "EST", 300], ["2026-03-08T07:00:00+00:00", "03:00:00", "EDT", 240], ["2026-11-01T05:59:59+00:00", "01:59:59", "EDT", 240], ["2026-11-01T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2027-03-14T06:59:59+00:00", "01:59:59", "EST", 300], ["2027-03-14T07:00:00+00:00", "03:00:00", "EDT", 240], ["2027-11-07T05:59:59+00:00", "01:59:59", "EDT", 240], ["2027-11-07T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2028-03-12T06:59:59+00:00", "01:59:59", "EST", 300], ["2028-03-12T07:00:00+00:00", "03:00:00", "EDT", 240], ["2028-11-05T05:59:59+00:00", "01:59:59", "EDT", 240], ["2028-11-05T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2029-03-11T06:59:59+00:00", "01:59:59", "EST", 300], ["2029-03-11T07:00:00+00:00", "03:00:00", "EDT", 240], ["2029-11-04T05:59:59+00:00", "01:59:59", "EDT", 240], ["2029-11-04T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2030-03-10T06:59:59+00:00", "01:59:59", "EST", 300], ["2030-03-10T07:00:00+00:00", "03:00:00", "EDT", 240], ["2030-11-03T05:59:59+00:00", "01:59:59", "EDT", 240], ["2030-11-03T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2031-03-09T06:59:59+00:00", "01:59:59", "EST", 300], ["2031-03-09T07:00:00+00:00", "03:00:00", "EDT", 240], ["2031-11-02T05:59:59+00:00", "01:59:59", "EDT", 240], ["2031-11-02T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2032-03-14T06:59:59+00:00", "01:59:59", "EST", 300], ["2032-03-14T07:00:00+00:00", "03:00:00", "EDT", 240], ["2032-11-07T05:59:59+00:00", "01:59:59", "EDT", 240], ["2032-11-07T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2033-03-13T06:59:59+00:00", "01:59:59", "EST", 300], ["2033-03-13T07:00:00+00:00", "03:00:00", "EDT", 240], ["2033-11-06T05:59:59+00:00", "01:59:59", "EDT", 240], ["2033-11-06T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2034-03-12T06:59:59+00:00", "01:59:59", "EST", 300], ["2034-03-12T07:00:00+00:00", "03:00:00", "EDT", 240], ["2034-11-05T05:59:59+00:00", "01:59:59", "EDT", 240], ["2034-11-05T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2035-03-11T06:59:59+00:00", "01:59:59", "EST", 300], ["2035-03-11T07:00:00+00:00", "03:00:00", "EDT", 240], ["2035-11-04T05:59:59+00:00", "01:59:59", "EDT", 240], ["2035-11-04T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2036-03-09T06:59:59+00:00", "01:59:59", "EST", 300], ["2036-03-09T07:00:00+00:00", "03:00:00", "EDT", 240], ["2036-11-02T05:59:59+00:00", "01:59:59", "EDT", 240], ["2036-11-02T06:00:00+00:00", "01:00:00", "EST", 300]]);
        helpers.testYear("America/Nipigon", [["2037-03-08T06:59:59+00:00", "01:59:59", "EST", 300], ["2037-03-08T07:00:00+00:00", "03:00:00", "EDT", 240], ["2037-11-01T05:59:59+00:00", "01:59:59", "EDT", 240], ["2037-11-01T06:00:00+00:00", "01:00:00", "EST", 300]]);
    });
});