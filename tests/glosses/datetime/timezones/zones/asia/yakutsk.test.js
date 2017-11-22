

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Asia/Yakutsk", () => {
        helpers.testYear("Asia/Yakutsk", [["1919-12-14T15:21:01+00:00", "23:59:59", "LMT", -31138 / 60], ["1919-12-14T15:21:02+00:00", "23:21:02", "+08", -480]]);
        helpers.testYear("Asia/Yakutsk", [["1930-06-20T15:59:59+00:00", "23:59:59", "+08", -480], ["1930-06-20T16:00:00+00:00", "01:00:00", "+09", -540]]);
        helpers.testYear("Asia/Yakutsk", [["1981-03-31T14:59:59+00:00", "23:59:59", "+09", -540], ["1981-03-31T15:00:00+00:00", "01:00:00", "+10", -600], ["1981-09-30T13:59:59+00:00", "23:59:59", "+10", -600], ["1981-09-30T14:00:00+00:00", "23:00:00", "+09", -540]]);
        helpers.testYear("Asia/Yakutsk", [["1982-03-31T14:59:59+00:00", "23:59:59", "+09", -540], ["1982-03-31T15:00:00+00:00", "01:00:00", "+10", -600], ["1982-09-30T13:59:59+00:00", "23:59:59", "+10", -600], ["1982-09-30T14:00:00+00:00", "23:00:00", "+09", -540]]);
        helpers.testYear("Asia/Yakutsk", [["1983-03-31T14:59:59+00:00", "23:59:59", "+09", -540], ["1983-03-31T15:00:00+00:00", "01:00:00", "+10", -600], ["1983-09-30T13:59:59+00:00", "23:59:59", "+10", -600], ["1983-09-30T14:00:00+00:00", "23:00:00", "+09", -540]]);
        helpers.testYear("Asia/Yakutsk", [["1984-03-31T14:59:59+00:00", "23:59:59", "+09", -540], ["1984-03-31T15:00:00+00:00", "01:00:00", "+10", -600], ["1984-09-29T16:59:59+00:00", "02:59:59", "+10", -600], ["1984-09-29T17:00:00+00:00", "02:00:00", "+09", -540]]);
        helpers.testYear("Asia/Yakutsk", [["1985-03-30T16:59:59+00:00", "01:59:59", "+09", -540], ["1985-03-30T17:00:00+00:00", "03:00:00", "+10", -600], ["1985-09-28T16:59:59+00:00", "02:59:59", "+10", -600], ["1985-09-28T17:00:00+00:00", "02:00:00", "+09", -540]]);
        helpers.testYear("Asia/Yakutsk", [["1986-03-29T16:59:59+00:00", "01:59:59", "+09", -540], ["1986-03-29T17:00:00+00:00", "03:00:00", "+10", -600], ["1986-09-27T16:59:59+00:00", "02:59:59", "+10", -600], ["1986-09-27T17:00:00+00:00", "02:00:00", "+09", -540]]);
        helpers.testYear("Asia/Yakutsk", [["1987-03-28T16:59:59+00:00", "01:59:59", "+09", -540], ["1987-03-28T17:00:00+00:00", "03:00:00", "+10", -600], ["1987-09-26T16:59:59+00:00", "02:59:59", "+10", -600], ["1987-09-26T17:00:00+00:00", "02:00:00", "+09", -540]]);
        helpers.testYear("Asia/Yakutsk", [["1988-03-26T16:59:59+00:00", "01:59:59", "+09", -540], ["1988-03-26T17:00:00+00:00", "03:00:00", "+10", -600], ["1988-09-24T16:59:59+00:00", "02:59:59", "+10", -600], ["1988-09-24T17:00:00+00:00", "02:00:00", "+09", -540]]);
        helpers.testYear("Asia/Yakutsk", [["1989-03-25T16:59:59+00:00", "01:59:59", "+09", -540], ["1989-03-25T17:00:00+00:00", "03:00:00", "+10", -600], ["1989-09-23T16:59:59+00:00", "02:59:59", "+10", -600], ["1989-09-23T17:00:00+00:00", "02:00:00", "+09", -540]]);
        helpers.testYear("Asia/Yakutsk", [["1990-03-24T16:59:59+00:00", "01:59:59", "+09", -540], ["1990-03-24T17:00:00+00:00", "03:00:00", "+10", -600], ["1990-09-29T16:59:59+00:00", "02:59:59", "+10", -600], ["1990-09-29T17:00:00+00:00", "02:00:00", "+09", -540]]);
        helpers.testYear("Asia/Yakutsk", [["1991-03-30T16:59:59+00:00", "01:59:59", "+09", -540], ["1991-03-30T17:00:00+00:00", "02:00:00", "+09", -540], ["1991-09-28T17:59:59+00:00", "02:59:59", "+09", -540], ["1991-09-28T18:00:00+00:00", "02:00:00", "+08", -480]]);
        helpers.testYear("Asia/Yakutsk", [["1992-01-18T17:59:59+00:00", "01:59:59", "+08", -480], ["1992-01-18T18:00:00+00:00", "03:00:00", "+09", -540], ["1992-03-28T16:59:59+00:00", "01:59:59", "+09", -540], ["1992-03-28T17:00:00+00:00", "03:00:00", "+10", -600], ["1992-09-26T16:59:59+00:00", "02:59:59", "+10", -600], ["1992-09-26T17:00:00+00:00", "02:00:00", "+09", -540]]);
        helpers.testYear("Asia/Yakutsk", [["1993-03-27T16:59:59+00:00", "01:59:59", "+09", -540], ["1993-03-27T17:00:00+00:00", "03:00:00", "+10", -600], ["1993-09-25T16:59:59+00:00", "02:59:59", "+10", -600], ["1993-09-25T17:00:00+00:00", "02:00:00", "+09", -540]]);
        helpers.testYear("Asia/Yakutsk", [["1994-03-26T16:59:59+00:00", "01:59:59", "+09", -540], ["1994-03-26T17:00:00+00:00", "03:00:00", "+10", -600], ["1994-09-24T16:59:59+00:00", "02:59:59", "+10", -600], ["1994-09-24T17:00:00+00:00", "02:00:00", "+09", -540]]);
        helpers.testYear("Asia/Yakutsk", [["1995-03-25T16:59:59+00:00", "01:59:59", "+09", -540], ["1995-03-25T17:00:00+00:00", "03:00:00", "+10", -600], ["1995-09-23T16:59:59+00:00", "02:59:59", "+10", -600], ["1995-09-23T17:00:00+00:00", "02:00:00", "+09", -540]]);
        helpers.testYear("Asia/Yakutsk", [["1996-03-30T16:59:59+00:00", "01:59:59", "+09", -540], ["1996-03-30T17:00:00+00:00", "03:00:00", "+10", -600], ["1996-10-26T16:59:59+00:00", "02:59:59", "+10", -600], ["1996-10-26T17:00:00+00:00", "02:00:00", "+09", -540]]);
        helpers.testYear("Asia/Yakutsk", [["1997-03-29T16:59:59+00:00", "01:59:59", "+09", -540], ["1997-03-29T17:00:00+00:00", "03:00:00", "+10", -600], ["1997-10-25T16:59:59+00:00", "02:59:59", "+10", -600], ["1997-10-25T17:00:00+00:00", "02:00:00", "+09", -540]]);
        helpers.testYear("Asia/Yakutsk", [["1998-03-28T16:59:59+00:00", "01:59:59", "+09", -540], ["1998-03-28T17:00:00+00:00", "03:00:00", "+10", -600], ["1998-10-24T16:59:59+00:00", "02:59:59", "+10", -600], ["1998-10-24T17:00:00+00:00", "02:00:00", "+09", -540]]);
        helpers.testYear("Asia/Yakutsk", [["1999-03-27T16:59:59+00:00", "01:59:59", "+09", -540], ["1999-03-27T17:00:00+00:00", "03:00:00", "+10", -600], ["1999-10-30T16:59:59+00:00", "02:59:59", "+10", -600], ["1999-10-30T17:00:00+00:00", "02:00:00", "+09", -540]]);
        helpers.testYear("Asia/Yakutsk", [["2000-03-25T16:59:59+00:00", "01:59:59", "+09", -540], ["2000-03-25T17:00:00+00:00", "03:00:00", "+10", -600], ["2000-10-28T16:59:59+00:00", "02:59:59", "+10", -600], ["2000-10-28T17:00:00+00:00", "02:00:00", "+09", -540]]);
        helpers.testYear("Asia/Yakutsk", [["2001-03-24T16:59:59+00:00", "01:59:59", "+09", -540], ["2001-03-24T17:00:00+00:00", "03:00:00", "+10", -600], ["2001-10-27T16:59:59+00:00", "02:59:59", "+10", -600], ["2001-10-27T17:00:00+00:00", "02:00:00", "+09", -540]]);
        helpers.testYear("Asia/Yakutsk", [["2002-03-30T16:59:59+00:00", "01:59:59", "+09", -540], ["2002-03-30T17:00:00+00:00", "03:00:00", "+10", -600], ["2002-10-26T16:59:59+00:00", "02:59:59", "+10", -600], ["2002-10-26T17:00:00+00:00", "02:00:00", "+09", -540]]);
        helpers.testYear("Asia/Yakutsk", [["2003-03-29T16:59:59+00:00", "01:59:59", "+09", -540], ["2003-03-29T17:00:00+00:00", "03:00:00", "+10", -600], ["2003-10-25T16:59:59+00:00", "02:59:59", "+10", -600], ["2003-10-25T17:00:00+00:00", "02:00:00", "+09", -540]]);
        helpers.testYear("Asia/Yakutsk", [["2004-03-27T16:59:59+00:00", "01:59:59", "+09", -540], ["2004-03-27T17:00:00+00:00", "03:00:00", "+10", -600], ["2004-10-30T16:59:59+00:00", "02:59:59", "+10", -600], ["2004-10-30T17:00:00+00:00", "02:00:00", "+09", -540]]);
        helpers.testYear("Asia/Yakutsk", [["2005-03-26T16:59:59+00:00", "01:59:59", "+09", -540], ["2005-03-26T17:00:00+00:00", "03:00:00", "+10", -600], ["2005-10-29T16:59:59+00:00", "02:59:59", "+10", -600], ["2005-10-29T17:00:00+00:00", "02:00:00", "+09", -540]]);
        helpers.testYear("Asia/Yakutsk", [["2006-03-25T16:59:59+00:00", "01:59:59", "+09", -540], ["2006-03-25T17:00:00+00:00", "03:00:00", "+10", -600], ["2006-10-28T16:59:59+00:00", "02:59:59", "+10", -600], ["2006-10-28T17:00:00+00:00", "02:00:00", "+09", -540]]);
        helpers.testYear("Asia/Yakutsk", [["2007-03-24T16:59:59+00:00", "01:59:59", "+09", -540], ["2007-03-24T17:00:00+00:00", "03:00:00", "+10", -600], ["2007-10-27T16:59:59+00:00", "02:59:59", "+10", -600], ["2007-10-27T17:00:00+00:00", "02:00:00", "+09", -540]]);
        helpers.testYear("Asia/Yakutsk", [["2008-03-29T16:59:59+00:00", "01:59:59", "+09", -540], ["2008-03-29T17:00:00+00:00", "03:00:00", "+10", -600], ["2008-10-25T16:59:59+00:00", "02:59:59", "+10", -600], ["2008-10-25T17:00:00+00:00", "02:00:00", "+09", -540]]);
        helpers.testYear("Asia/Yakutsk", [["2009-03-28T16:59:59+00:00", "01:59:59", "+09", -540], ["2009-03-28T17:00:00+00:00", "03:00:00", "+10", -600], ["2009-10-24T16:59:59+00:00", "02:59:59", "+10", -600], ["2009-10-24T17:00:00+00:00", "02:00:00", "+09", -540]]);
        helpers.testYear("Asia/Yakutsk", [["2010-03-27T16:59:59+00:00", "01:59:59", "+09", -540], ["2010-03-27T17:00:00+00:00", "03:00:00", "+10", -600], ["2010-10-30T16:59:59+00:00", "02:59:59", "+10", -600], ["2010-10-30T17:00:00+00:00", "02:00:00", "+09", -540]]);
        helpers.testYear("Asia/Yakutsk", [["2011-03-26T16:59:59+00:00", "01:59:59", "+09", -540], ["2011-03-26T17:00:00+00:00", "03:00:00", "+10", -600]]);
        helpers.testYear("Asia/Yakutsk", [["2014-10-25T15:59:59+00:00", "01:59:59", "+10", -600], ["2014-10-25T16:00:00+00:00", "01:00:00", "+09", -540]]);
    });
});
