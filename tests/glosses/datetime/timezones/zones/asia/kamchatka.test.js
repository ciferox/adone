

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Asia/Kamchatka", () => {
        helpers.testYear("Asia/Kamchatka", [["1922-11-09T13:25:23+00:00", "23:59:59", "LMT", -38076 / 60], ["1922-11-09T13:25:24+00:00", "00:25:24", "+11", -660]]);
        helpers.testYear("Asia/Kamchatka", [["1930-06-20T12:59:59+00:00", "23:59:59", "+11", -660], ["1930-06-20T13:00:00+00:00", "01:00:00", "+12", -720]]);
        helpers.testYear("Asia/Kamchatka", [["1981-03-31T11:59:59+00:00", "23:59:59", "+12", -720], ["1981-03-31T12:00:00+00:00", "01:00:00", "+13", -780], ["1981-09-30T10:59:59+00:00", "23:59:59", "+13", -780], ["1981-09-30T11:00:00+00:00", "23:00:00", "+12", -720]]);
        helpers.testYear("Asia/Kamchatka", [["1982-03-31T11:59:59+00:00", "23:59:59", "+12", -720], ["1982-03-31T12:00:00+00:00", "01:00:00", "+13", -780], ["1982-09-30T10:59:59+00:00", "23:59:59", "+13", -780], ["1982-09-30T11:00:00+00:00", "23:00:00", "+12", -720]]);
        helpers.testYear("Asia/Kamchatka", [["1983-03-31T11:59:59+00:00", "23:59:59", "+12", -720], ["1983-03-31T12:00:00+00:00", "01:00:00", "+13", -780], ["1983-09-30T10:59:59+00:00", "23:59:59", "+13", -780], ["1983-09-30T11:00:00+00:00", "23:00:00", "+12", -720]]);
        helpers.testYear("Asia/Kamchatka", [["1984-03-31T11:59:59+00:00", "23:59:59", "+12", -720], ["1984-03-31T12:00:00+00:00", "01:00:00", "+13", -780], ["1984-09-29T13:59:59+00:00", "02:59:59", "+13", -780], ["1984-09-29T14:00:00+00:00", "02:00:00", "+12", -720]]);
        helpers.testYear("Asia/Kamchatka", [["1985-03-30T13:59:59+00:00", "01:59:59", "+12", -720], ["1985-03-30T14:00:00+00:00", "03:00:00", "+13", -780], ["1985-09-28T13:59:59+00:00", "02:59:59", "+13", -780], ["1985-09-28T14:00:00+00:00", "02:00:00", "+12", -720]]);
        helpers.testYear("Asia/Kamchatka", [["1986-03-29T13:59:59+00:00", "01:59:59", "+12", -720], ["1986-03-29T14:00:00+00:00", "03:00:00", "+13", -780], ["1986-09-27T13:59:59+00:00", "02:59:59", "+13", -780], ["1986-09-27T14:00:00+00:00", "02:00:00", "+12", -720]]);
        helpers.testYear("Asia/Kamchatka", [["1987-03-28T13:59:59+00:00", "01:59:59", "+12", -720], ["1987-03-28T14:00:00+00:00", "03:00:00", "+13", -780], ["1987-09-26T13:59:59+00:00", "02:59:59", "+13", -780], ["1987-09-26T14:00:00+00:00", "02:00:00", "+12", -720]]);
        helpers.testYear("Asia/Kamchatka", [["1988-03-26T13:59:59+00:00", "01:59:59", "+12", -720], ["1988-03-26T14:00:00+00:00", "03:00:00", "+13", -780], ["1988-09-24T13:59:59+00:00", "02:59:59", "+13", -780], ["1988-09-24T14:00:00+00:00", "02:00:00", "+12", -720]]);
        helpers.testYear("Asia/Kamchatka", [["1989-03-25T13:59:59+00:00", "01:59:59", "+12", -720], ["1989-03-25T14:00:00+00:00", "03:00:00", "+13", -780], ["1989-09-23T13:59:59+00:00", "02:59:59", "+13", -780], ["1989-09-23T14:00:00+00:00", "02:00:00", "+12", -720]]);
        helpers.testYear("Asia/Kamchatka", [["1990-03-24T13:59:59+00:00", "01:59:59", "+12", -720], ["1990-03-24T14:00:00+00:00", "03:00:00", "+13", -780], ["1990-09-29T13:59:59+00:00", "02:59:59", "+13", -780], ["1990-09-29T14:00:00+00:00", "02:00:00", "+12", -720]]);
        helpers.testYear("Asia/Kamchatka", [["1991-03-30T13:59:59+00:00", "01:59:59", "+12", -720], ["1991-03-30T14:00:00+00:00", "02:00:00", "+12", -720], ["1991-09-28T14:59:59+00:00", "02:59:59", "+12", -720], ["1991-09-28T15:00:00+00:00", "02:00:00", "+11", -660]]);
        helpers.testYear("Asia/Kamchatka", [["1992-01-18T14:59:59+00:00", "01:59:59", "+11", -660], ["1992-01-18T15:00:00+00:00", "03:00:00", "+12", -720], ["1992-03-28T13:59:59+00:00", "01:59:59", "+12", -720], ["1992-03-28T14:00:00+00:00", "03:00:00", "+13", -780], ["1992-09-26T13:59:59+00:00", "02:59:59", "+13", -780], ["1992-09-26T14:00:00+00:00", "02:00:00", "+12", -720]]);
        helpers.testYear("Asia/Kamchatka", [["1993-03-27T13:59:59+00:00", "01:59:59", "+12", -720], ["1993-03-27T14:00:00+00:00", "03:00:00", "+13", -780], ["1993-09-25T13:59:59+00:00", "02:59:59", "+13", -780], ["1993-09-25T14:00:00+00:00", "02:00:00", "+12", -720]]);
        helpers.testYear("Asia/Kamchatka", [["1994-03-26T13:59:59+00:00", "01:59:59", "+12", -720], ["1994-03-26T14:00:00+00:00", "03:00:00", "+13", -780], ["1994-09-24T13:59:59+00:00", "02:59:59", "+13", -780], ["1994-09-24T14:00:00+00:00", "02:00:00", "+12", -720]]);
        helpers.testYear("Asia/Kamchatka", [["1995-03-25T13:59:59+00:00", "01:59:59", "+12", -720], ["1995-03-25T14:00:00+00:00", "03:00:00", "+13", -780], ["1995-09-23T13:59:59+00:00", "02:59:59", "+13", -780], ["1995-09-23T14:00:00+00:00", "02:00:00", "+12", -720]]);
        helpers.testYear("Asia/Kamchatka", [["1996-03-30T13:59:59+00:00", "01:59:59", "+12", -720], ["1996-03-30T14:00:00+00:00", "03:00:00", "+13", -780], ["1996-10-26T13:59:59+00:00", "02:59:59", "+13", -780], ["1996-10-26T14:00:00+00:00", "02:00:00", "+12", -720]]);
        helpers.testYear("Asia/Kamchatka", [["1997-03-29T13:59:59+00:00", "01:59:59", "+12", -720], ["1997-03-29T14:00:00+00:00", "03:00:00", "+13", -780], ["1997-10-25T13:59:59+00:00", "02:59:59", "+13", -780], ["1997-10-25T14:00:00+00:00", "02:00:00", "+12", -720]]);
        helpers.testYear("Asia/Kamchatka", [["1998-03-28T13:59:59+00:00", "01:59:59", "+12", -720], ["1998-03-28T14:00:00+00:00", "03:00:00", "+13", -780], ["1998-10-24T13:59:59+00:00", "02:59:59", "+13", -780], ["1998-10-24T14:00:00+00:00", "02:00:00", "+12", -720]]);
        helpers.testYear("Asia/Kamchatka", [["1999-03-27T13:59:59+00:00", "01:59:59", "+12", -720], ["1999-03-27T14:00:00+00:00", "03:00:00", "+13", -780], ["1999-10-30T13:59:59+00:00", "02:59:59", "+13", -780], ["1999-10-30T14:00:00+00:00", "02:00:00", "+12", -720]]);
        helpers.testYear("Asia/Kamchatka", [["2000-03-25T13:59:59+00:00", "01:59:59", "+12", -720], ["2000-03-25T14:00:00+00:00", "03:00:00", "+13", -780], ["2000-10-28T13:59:59+00:00", "02:59:59", "+13", -780], ["2000-10-28T14:00:00+00:00", "02:00:00", "+12", -720]]);
        helpers.testYear("Asia/Kamchatka", [["2001-03-24T13:59:59+00:00", "01:59:59", "+12", -720], ["2001-03-24T14:00:00+00:00", "03:00:00", "+13", -780], ["2001-10-27T13:59:59+00:00", "02:59:59", "+13", -780], ["2001-10-27T14:00:00+00:00", "02:00:00", "+12", -720]]);
        helpers.testYear("Asia/Kamchatka", [["2002-03-30T13:59:59+00:00", "01:59:59", "+12", -720], ["2002-03-30T14:00:00+00:00", "03:00:00", "+13", -780], ["2002-10-26T13:59:59+00:00", "02:59:59", "+13", -780], ["2002-10-26T14:00:00+00:00", "02:00:00", "+12", -720]]);
        helpers.testYear("Asia/Kamchatka", [["2003-03-29T13:59:59+00:00", "01:59:59", "+12", -720], ["2003-03-29T14:00:00+00:00", "03:00:00", "+13", -780], ["2003-10-25T13:59:59+00:00", "02:59:59", "+13", -780], ["2003-10-25T14:00:00+00:00", "02:00:00", "+12", -720]]);
        helpers.testYear("Asia/Kamchatka", [["2004-03-27T13:59:59+00:00", "01:59:59", "+12", -720], ["2004-03-27T14:00:00+00:00", "03:00:00", "+13", -780], ["2004-10-30T13:59:59+00:00", "02:59:59", "+13", -780], ["2004-10-30T14:00:00+00:00", "02:00:00", "+12", -720]]);
        helpers.testYear("Asia/Kamchatka", [["2005-03-26T13:59:59+00:00", "01:59:59", "+12", -720], ["2005-03-26T14:00:00+00:00", "03:00:00", "+13", -780], ["2005-10-29T13:59:59+00:00", "02:59:59", "+13", -780], ["2005-10-29T14:00:00+00:00", "02:00:00", "+12", -720]]);
        helpers.testYear("Asia/Kamchatka", [["2006-03-25T13:59:59+00:00", "01:59:59", "+12", -720], ["2006-03-25T14:00:00+00:00", "03:00:00", "+13", -780], ["2006-10-28T13:59:59+00:00", "02:59:59", "+13", -780], ["2006-10-28T14:00:00+00:00", "02:00:00", "+12", -720]]);
        helpers.testYear("Asia/Kamchatka", [["2007-03-24T13:59:59+00:00", "01:59:59", "+12", -720], ["2007-03-24T14:00:00+00:00", "03:00:00", "+13", -780], ["2007-10-27T13:59:59+00:00", "02:59:59", "+13", -780], ["2007-10-27T14:00:00+00:00", "02:00:00", "+12", -720]]);
        helpers.testYear("Asia/Kamchatka", [["2008-03-29T13:59:59+00:00", "01:59:59", "+12", -720], ["2008-03-29T14:00:00+00:00", "03:00:00", "+13", -780], ["2008-10-25T13:59:59+00:00", "02:59:59", "+13", -780], ["2008-10-25T14:00:00+00:00", "02:00:00", "+12", -720]]);
        helpers.testYear("Asia/Kamchatka", [["2009-03-28T13:59:59+00:00", "01:59:59", "+12", -720], ["2009-03-28T14:00:00+00:00", "03:00:00", "+13", -780], ["2009-10-24T13:59:59+00:00", "02:59:59", "+13", -780], ["2009-10-24T14:00:00+00:00", "02:00:00", "+12", -720]]);
        helpers.testYear("Asia/Kamchatka", [["2010-03-27T13:59:59+00:00", "01:59:59", "+12", -720], ["2010-03-27T14:00:00+00:00", "02:00:00", "+12", -720], ["2010-10-30T14:59:59+00:00", "02:59:59", "+12", -720], ["2010-10-30T15:00:00+00:00", "02:00:00", "+11", -660]]);
        helpers.testYear("Asia/Kamchatka", [["2011-03-26T14:59:59+00:00", "01:59:59", "+11", -660], ["2011-03-26T15:00:00+00:00", "03:00:00", "+12", -720]]);
    });
});
