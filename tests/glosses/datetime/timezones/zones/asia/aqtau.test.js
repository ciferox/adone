

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Asia/Aqtau", () => {
        helpers.testYear("Asia/Aqtau", [["1924-05-01T20:38:55+00:00", "23:59:59", "LMT", -12064 / 60], ["1924-05-01T20:38:56+00:00", "00:38:56", "+04", -240]]);
        helpers.testYear("Asia/Aqtau", [["1930-06-20T19:59:59+00:00", "23:59:59", "+04", -240], ["1930-06-20T20:00:00+00:00", "01:00:00", "+05", -300]]);
        helpers.testYear("Asia/Aqtau", [["1981-09-30T18:59:59+00:00", "23:59:59", "+05", -300], ["1981-09-30T19:00:00+00:00", "01:00:00", "+06", -360]]);
        helpers.testYear("Asia/Aqtau", [["1982-03-31T17:59:59+00:00", "23:59:59", "+06", -360], ["1982-03-31T18:00:00+00:00", "00:00:00", "+06", -360], ["1982-09-30T17:59:59+00:00", "23:59:59", "+06", -360], ["1982-09-30T18:00:00+00:00", "23:00:00", "+05", -300]]);
        helpers.testYear("Asia/Aqtau", [["1983-03-31T18:59:59+00:00", "23:59:59", "+05", -300], ["1983-03-31T19:00:00+00:00", "01:00:00", "+06", -360], ["1983-09-30T17:59:59+00:00", "23:59:59", "+06", -360], ["1983-09-30T18:00:00+00:00", "23:00:00", "+05", -300]]);
        helpers.testYear("Asia/Aqtau", [["1984-03-31T18:59:59+00:00", "23:59:59", "+05", -300], ["1984-03-31T19:00:00+00:00", "01:00:00", "+06", -360], ["1984-09-29T20:59:59+00:00", "02:59:59", "+06", -360], ["1984-09-29T21:00:00+00:00", "02:00:00", "+05", -300]]);
        helpers.testYear("Asia/Aqtau", [["1985-03-30T20:59:59+00:00", "01:59:59", "+05", -300], ["1985-03-30T21:00:00+00:00", "03:00:00", "+06", -360], ["1985-09-28T20:59:59+00:00", "02:59:59", "+06", -360], ["1985-09-28T21:00:00+00:00", "02:00:00", "+05", -300]]);
        helpers.testYear("Asia/Aqtau", [["1986-03-29T20:59:59+00:00", "01:59:59", "+05", -300], ["1986-03-29T21:00:00+00:00", "03:00:00", "+06", -360], ["1986-09-27T20:59:59+00:00", "02:59:59", "+06", -360], ["1986-09-27T21:00:00+00:00", "02:00:00", "+05", -300]]);
        helpers.testYear("Asia/Aqtau", [["1987-03-28T20:59:59+00:00", "01:59:59", "+05", -300], ["1987-03-28T21:00:00+00:00", "03:00:00", "+06", -360], ["1987-09-26T20:59:59+00:00", "02:59:59", "+06", -360], ["1987-09-26T21:00:00+00:00", "02:00:00", "+05", -300]]);
        helpers.testYear("Asia/Aqtau", [["1988-03-26T20:59:59+00:00", "01:59:59", "+05", -300], ["1988-03-26T21:00:00+00:00", "03:00:00", "+06", -360], ["1988-09-24T20:59:59+00:00", "02:59:59", "+06", -360], ["1988-09-24T21:00:00+00:00", "02:00:00", "+05", -300]]);
        helpers.testYear("Asia/Aqtau", [["1989-03-25T20:59:59+00:00", "01:59:59", "+05", -300], ["1989-03-25T21:00:00+00:00", "03:00:00", "+06", -360], ["1989-09-23T20:59:59+00:00", "02:59:59", "+06", -360], ["1989-09-23T21:00:00+00:00", "02:00:00", "+05", -300]]);
        helpers.testYear("Asia/Aqtau", [["1990-03-24T20:59:59+00:00", "01:59:59", "+05", -300], ["1990-03-24T21:00:00+00:00", "03:00:00", "+06", -360], ["1990-09-29T20:59:59+00:00", "02:59:59", "+06", -360], ["1990-09-29T21:00:00+00:00", "02:00:00", "+05", -300]]);
        helpers.testYear("Asia/Aqtau", [["1991-03-30T20:59:59+00:00", "01:59:59", "+05", -300], ["1991-03-30T21:00:00+00:00", "02:00:00", "+05", -300], ["1991-09-28T21:59:59+00:00", "02:59:59", "+05", -300], ["1991-09-28T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Asia/Aqtau", [["1992-01-18T21:59:59+00:00", "01:59:59", "+04", -240], ["1992-01-18T22:00:00+00:00", "03:00:00", "+05", -300], ["1992-03-28T20:59:59+00:00", "01:59:59", "+05", -300], ["1992-03-28T21:00:00+00:00", "03:00:00", "+06", -360], ["1992-09-26T20:59:59+00:00", "02:59:59", "+06", -360], ["1992-09-26T21:00:00+00:00", "02:00:00", "+05", -300]]);
        helpers.testYear("Asia/Aqtau", [["1993-03-27T20:59:59+00:00", "01:59:59", "+05", -300], ["1993-03-27T21:00:00+00:00", "03:00:00", "+06", -360], ["1993-09-25T20:59:59+00:00", "02:59:59", "+06", -360], ["1993-09-25T21:00:00+00:00", "02:00:00", "+05", -300]]);
        helpers.testYear("Asia/Aqtau", [["1994-03-26T20:59:59+00:00", "01:59:59", "+05", -300], ["1994-03-26T21:00:00+00:00", "03:00:00", "+06", -360], ["1994-09-24T20:59:59+00:00", "02:59:59", "+06", -360], ["1994-09-24T21:00:00+00:00", "01:00:00", "+04", -240]]);
        helpers.testYear("Asia/Aqtau", [["1995-03-25T21:59:59+00:00", "01:59:59", "+04", -240], ["1995-03-25T22:00:00+00:00", "03:00:00", "+05", -300], ["1995-09-23T21:59:59+00:00", "02:59:59", "+05", -300], ["1995-09-23T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Asia/Aqtau", [["1996-03-30T21:59:59+00:00", "01:59:59", "+04", -240], ["1996-03-30T22:00:00+00:00", "03:00:00", "+05", -300], ["1996-10-26T21:59:59+00:00", "02:59:59", "+05", -300], ["1996-10-26T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Asia/Aqtau", [["1997-03-29T21:59:59+00:00", "01:59:59", "+04", -240], ["1997-03-29T22:00:00+00:00", "03:00:00", "+05", -300], ["1997-10-25T21:59:59+00:00", "02:59:59", "+05", -300], ["1997-10-25T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Asia/Aqtau", [["1998-03-28T21:59:59+00:00", "01:59:59", "+04", -240], ["1998-03-28T22:00:00+00:00", "03:00:00", "+05", -300], ["1998-10-24T21:59:59+00:00", "02:59:59", "+05", -300], ["1998-10-24T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Asia/Aqtau", [["1999-03-27T21:59:59+00:00", "01:59:59", "+04", -240], ["1999-03-27T22:00:00+00:00", "03:00:00", "+05", -300], ["1999-10-30T21:59:59+00:00", "02:59:59", "+05", -300], ["1999-10-30T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Asia/Aqtau", [["2000-03-25T21:59:59+00:00", "01:59:59", "+04", -240], ["2000-03-25T22:00:00+00:00", "03:00:00", "+05", -300], ["2000-10-28T21:59:59+00:00", "02:59:59", "+05", -300], ["2000-10-28T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Asia/Aqtau", [["2001-03-24T21:59:59+00:00", "01:59:59", "+04", -240], ["2001-03-24T22:00:00+00:00", "03:00:00", "+05", -300], ["2001-10-27T21:59:59+00:00", "02:59:59", "+05", -300], ["2001-10-27T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Asia/Aqtau", [["2002-03-30T21:59:59+00:00", "01:59:59", "+04", -240], ["2002-03-30T22:00:00+00:00", "03:00:00", "+05", -300], ["2002-10-26T21:59:59+00:00", "02:59:59", "+05", -300], ["2002-10-26T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Asia/Aqtau", [["2003-03-29T21:59:59+00:00", "01:59:59", "+04", -240], ["2003-03-29T22:00:00+00:00", "03:00:00", "+05", -300], ["2003-10-25T21:59:59+00:00", "02:59:59", "+05", -300], ["2003-10-25T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Asia/Aqtau", [["2004-03-27T21:59:59+00:00", "01:59:59", "+04", -240], ["2004-03-27T22:00:00+00:00", "03:00:00", "+05", -300], ["2004-10-30T21:59:59+00:00", "02:59:59", "+05", -300], ["2004-10-30T22:00:00+00:00", "03:00:00", "+05", -300]]);
    });
});