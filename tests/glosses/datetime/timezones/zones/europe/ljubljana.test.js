

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Europe/Ljubljana", () => {
        helpers.testYear("Europe/Ljubljana", [["1941-04-18T21:59:59+00:00", "22:59:59", "CET", -60], ["1941-04-18T22:00:00+00:00", "00:00:00", "CEST", -120]]);
        helpers.testYear("Europe/Ljubljana", [["1942-11-02T00:59:59+00:00", "02:59:59", "CEST", -120], ["1942-11-02T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["1943-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["1943-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["1943-10-04T00:59:59+00:00", "02:59:59", "CEST", -120], ["1943-10-04T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["1944-04-03T00:59:59+00:00", "01:59:59", "CET", -60], ["1944-04-03T01:00:00+00:00", "03:00:00", "CEST", -120], ["1944-10-02T00:59:59+00:00", "02:59:59", "CEST", -120], ["1944-10-02T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["1945-05-08T00:59:59+00:00", "01:59:59", "CET", -60], ["1945-05-08T01:00:00+00:00", "03:00:00", "CEST", -120], ["1945-09-16T00:59:59+00:00", "02:59:59", "CEST", -120], ["1945-09-16T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["1983-03-27T00:59:59+00:00", "01:59:59", "CET", -60], ["1983-03-27T01:00:00+00:00", "03:00:00", "CEST", -120], ["1983-09-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["1983-09-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["1984-03-25T00:59:59+00:00", "01:59:59", "CET", -60], ["1984-03-25T01:00:00+00:00", "03:00:00", "CEST", -120], ["1984-09-30T00:59:59+00:00", "02:59:59", "CEST", -120], ["1984-09-30T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["1985-03-31T00:59:59+00:00", "01:59:59", "CET", -60], ["1985-03-31T01:00:00+00:00", "03:00:00", "CEST", -120], ["1985-09-29T00:59:59+00:00", "02:59:59", "CEST", -120], ["1985-09-29T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["1986-03-30T00:59:59+00:00", "01:59:59", "CET", -60], ["1986-03-30T01:00:00+00:00", "03:00:00", "CEST", -120], ["1986-09-28T00:59:59+00:00", "02:59:59", "CEST", -120], ["1986-09-28T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["1987-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["1987-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["1987-09-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["1987-09-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["1988-03-27T00:59:59+00:00", "01:59:59", "CET", -60], ["1988-03-27T01:00:00+00:00", "03:00:00", "CEST", -120], ["1988-09-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["1988-09-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["1989-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["1989-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["1989-09-24T00:59:59+00:00", "02:59:59", "CEST", -120], ["1989-09-24T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["1990-03-25T00:59:59+00:00", "01:59:59", "CET", -60], ["1990-03-25T01:00:00+00:00", "03:00:00", "CEST", -120], ["1990-09-30T00:59:59+00:00", "02:59:59", "CEST", -120], ["1990-09-30T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["1991-03-31T00:59:59+00:00", "01:59:59", "CET", -60], ["1991-03-31T01:00:00+00:00", "03:00:00", "CEST", -120], ["1991-09-29T00:59:59+00:00", "02:59:59", "CEST", -120], ["1991-09-29T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["1992-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["1992-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["1992-09-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["1992-09-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["1993-03-28T00:59:59+00:00", "01:59:59", "CET", -60], ["1993-03-28T01:00:00+00:00", "03:00:00", "CEST", -120], ["1993-09-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["1993-09-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["1994-03-27T00:59:59+00:00", "01:59:59", "CET", -60], ["1994-03-27T01:00:00+00:00", "03:00:00", "CEST", -120], ["1994-09-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["1994-09-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["1995-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["1995-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["1995-09-24T00:59:59+00:00", "02:59:59", "CEST", -120], ["1995-09-24T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["1996-03-31T00:59:59+00:00", "01:59:59", "CET", -60], ["1996-03-31T01:00:00+00:00", "03:00:00", "CEST", -120], ["1996-10-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["1996-10-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["1997-03-30T00:59:59+00:00", "01:59:59", "CET", -60], ["1997-03-30T01:00:00+00:00", "03:00:00", "CEST", -120], ["1997-10-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["1997-10-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["1998-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["1998-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["1998-10-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["1998-10-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["1999-03-28T00:59:59+00:00", "01:59:59", "CET", -60], ["1999-03-28T01:00:00+00:00", "03:00:00", "CEST", -120], ["1999-10-31T00:59:59+00:00", "02:59:59", "CEST", -120], ["1999-10-31T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2000-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["2000-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["2000-10-29T00:59:59+00:00", "02:59:59", "CEST", -120], ["2000-10-29T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2001-03-25T00:59:59+00:00", "01:59:59", "CET", -60], ["2001-03-25T01:00:00+00:00", "03:00:00", "CEST", -120], ["2001-10-28T00:59:59+00:00", "02:59:59", "CEST", -120], ["2001-10-28T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2002-03-31T00:59:59+00:00", "01:59:59", "CET", -60], ["2002-03-31T01:00:00+00:00", "03:00:00", "CEST", -120], ["2002-10-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["2002-10-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2003-03-30T00:59:59+00:00", "01:59:59", "CET", -60], ["2003-03-30T01:00:00+00:00", "03:00:00", "CEST", -120], ["2003-10-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["2003-10-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2004-03-28T00:59:59+00:00", "01:59:59", "CET", -60], ["2004-03-28T01:00:00+00:00", "03:00:00", "CEST", -120], ["2004-10-31T00:59:59+00:00", "02:59:59", "CEST", -120], ["2004-10-31T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2005-03-27T00:59:59+00:00", "01:59:59", "CET", -60], ["2005-03-27T01:00:00+00:00", "03:00:00", "CEST", -120], ["2005-10-30T00:59:59+00:00", "02:59:59", "CEST", -120], ["2005-10-30T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2006-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["2006-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["2006-10-29T00:59:59+00:00", "02:59:59", "CEST", -120], ["2006-10-29T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2007-03-25T00:59:59+00:00", "01:59:59", "CET", -60], ["2007-03-25T01:00:00+00:00", "03:00:00", "CEST", -120], ["2007-10-28T00:59:59+00:00", "02:59:59", "CEST", -120], ["2007-10-28T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2008-03-30T00:59:59+00:00", "01:59:59", "CET", -60], ["2008-03-30T01:00:00+00:00", "03:00:00", "CEST", -120], ["2008-10-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["2008-10-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2009-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["2009-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["2009-10-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["2009-10-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2010-03-28T00:59:59+00:00", "01:59:59", "CET", -60], ["2010-03-28T01:00:00+00:00", "03:00:00", "CEST", -120], ["2010-10-31T00:59:59+00:00", "02:59:59", "CEST", -120], ["2010-10-31T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2011-03-27T00:59:59+00:00", "01:59:59", "CET", -60], ["2011-03-27T01:00:00+00:00", "03:00:00", "CEST", -120], ["2011-10-30T00:59:59+00:00", "02:59:59", "CEST", -120], ["2011-10-30T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2012-03-25T00:59:59+00:00", "01:59:59", "CET", -60], ["2012-03-25T01:00:00+00:00", "03:00:00", "CEST", -120], ["2012-10-28T00:59:59+00:00", "02:59:59", "CEST", -120], ["2012-10-28T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2013-03-31T00:59:59+00:00", "01:59:59", "CET", -60], ["2013-03-31T01:00:00+00:00", "03:00:00", "CEST", -120], ["2013-10-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["2013-10-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2014-03-30T00:59:59+00:00", "01:59:59", "CET", -60], ["2014-03-30T01:00:00+00:00", "03:00:00", "CEST", -120], ["2014-10-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["2014-10-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2015-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["2015-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["2015-10-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["2015-10-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2016-03-27T00:59:59+00:00", "01:59:59", "CET", -60], ["2016-03-27T01:00:00+00:00", "03:00:00", "CEST", -120], ["2016-10-30T00:59:59+00:00", "02:59:59", "CEST", -120], ["2016-10-30T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2017-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["2017-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["2017-10-29T00:59:59+00:00", "02:59:59", "CEST", -120], ["2017-10-29T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2018-03-25T00:59:59+00:00", "01:59:59", "CET", -60], ["2018-03-25T01:00:00+00:00", "03:00:00", "CEST", -120], ["2018-10-28T00:59:59+00:00", "02:59:59", "CEST", -120], ["2018-10-28T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2019-03-31T00:59:59+00:00", "01:59:59", "CET", -60], ["2019-03-31T01:00:00+00:00", "03:00:00", "CEST", -120], ["2019-10-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["2019-10-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2020-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["2020-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["2020-10-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["2020-10-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2021-03-28T00:59:59+00:00", "01:59:59", "CET", -60], ["2021-03-28T01:00:00+00:00", "03:00:00", "CEST", -120], ["2021-10-31T00:59:59+00:00", "02:59:59", "CEST", -120], ["2021-10-31T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2022-03-27T00:59:59+00:00", "01:59:59", "CET", -60], ["2022-03-27T01:00:00+00:00", "03:00:00", "CEST", -120], ["2022-10-30T00:59:59+00:00", "02:59:59", "CEST", -120], ["2022-10-30T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2023-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["2023-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["2023-10-29T00:59:59+00:00", "02:59:59", "CEST", -120], ["2023-10-29T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2024-03-31T00:59:59+00:00", "01:59:59", "CET", -60], ["2024-03-31T01:00:00+00:00", "03:00:00", "CEST", -120], ["2024-10-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["2024-10-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2025-03-30T00:59:59+00:00", "01:59:59", "CET", -60], ["2025-03-30T01:00:00+00:00", "03:00:00", "CEST", -120], ["2025-10-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["2025-10-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2026-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["2026-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["2026-10-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["2026-10-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2027-03-28T00:59:59+00:00", "01:59:59", "CET", -60], ["2027-03-28T01:00:00+00:00", "03:00:00", "CEST", -120], ["2027-10-31T00:59:59+00:00", "02:59:59", "CEST", -120], ["2027-10-31T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2028-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["2028-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["2028-10-29T00:59:59+00:00", "02:59:59", "CEST", -120], ["2028-10-29T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2029-03-25T00:59:59+00:00", "01:59:59", "CET", -60], ["2029-03-25T01:00:00+00:00", "03:00:00", "CEST", -120], ["2029-10-28T00:59:59+00:00", "02:59:59", "CEST", -120], ["2029-10-28T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2030-03-31T00:59:59+00:00", "01:59:59", "CET", -60], ["2030-03-31T01:00:00+00:00", "03:00:00", "CEST", -120], ["2030-10-27T00:59:59+00:00", "02:59:59", "CEST", -120], ["2030-10-27T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2031-03-30T00:59:59+00:00", "01:59:59", "CET", -60], ["2031-03-30T01:00:00+00:00", "03:00:00", "CEST", -120], ["2031-10-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["2031-10-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2032-03-28T00:59:59+00:00", "01:59:59", "CET", -60], ["2032-03-28T01:00:00+00:00", "03:00:00", "CEST", -120], ["2032-10-31T00:59:59+00:00", "02:59:59", "CEST", -120], ["2032-10-31T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2033-03-27T00:59:59+00:00", "01:59:59", "CET", -60], ["2033-03-27T01:00:00+00:00", "03:00:00", "CEST", -120], ["2033-10-30T00:59:59+00:00", "02:59:59", "CEST", -120], ["2033-10-30T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2034-03-26T00:59:59+00:00", "01:59:59", "CET", -60], ["2034-03-26T01:00:00+00:00", "03:00:00", "CEST", -120], ["2034-10-29T00:59:59+00:00", "02:59:59", "CEST", -120], ["2034-10-29T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2035-03-25T00:59:59+00:00", "01:59:59", "CET", -60], ["2035-03-25T01:00:00+00:00", "03:00:00", "CEST", -120], ["2035-10-28T00:59:59+00:00", "02:59:59", "CEST", -120], ["2035-10-28T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2036-03-30T00:59:59+00:00", "01:59:59", "CET", -60], ["2036-03-30T01:00:00+00:00", "03:00:00", "CEST", -120], ["2036-10-26T00:59:59+00:00", "02:59:59", "CEST", -120], ["2036-10-26T01:00:00+00:00", "02:00:00", "CET", -60]]);
        helpers.testYear("Europe/Ljubljana", [["2037-03-29T00:59:59+00:00", "01:59:59", "CET", -60], ["2037-03-29T01:00:00+00:00", "03:00:00", "CEST", -120], ["2037-10-25T00:59:59+00:00", "02:59:59", "CEST", -120], ["2037-10-25T01:00:00+00:00", "02:00:00", "CET", -60]]);
    });
});