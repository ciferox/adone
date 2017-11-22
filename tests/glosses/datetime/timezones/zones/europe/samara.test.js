

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Europe/Samara", () => {
        helpers.testYear("Europe/Samara", [["1919-06-30T23:59:59+00:00", "03:20:19", "LMT", -12020 / 60], ["1919-07-01T00:00:00+00:00", "03:00:00", "+03", -180]]);
        helpers.testYear("Europe/Samara", [["1930-06-20T20:59:59+00:00", "23:59:59", "+03", -180], ["1930-06-20T21:00:00+00:00", "01:00:00", "+04", -240]]);
        helpers.testYear("Europe/Samara", [["1981-03-31T19:59:59+00:00", "23:59:59", "+04", -240], ["1981-03-31T20:00:00+00:00", "01:00:00", "+05", -300], ["1981-09-30T18:59:59+00:00", "23:59:59", "+05", -300], ["1981-09-30T19:00:00+00:00", "23:00:00", "+04", -240]]);
        helpers.testYear("Europe/Samara", [["1982-03-31T19:59:59+00:00", "23:59:59", "+04", -240], ["1982-03-31T20:00:00+00:00", "01:00:00", "+05", -300], ["1982-09-30T18:59:59+00:00", "23:59:59", "+05", -300], ["1982-09-30T19:00:00+00:00", "23:00:00", "+04", -240]]);
        helpers.testYear("Europe/Samara", [["1983-03-31T19:59:59+00:00", "23:59:59", "+04", -240], ["1983-03-31T20:00:00+00:00", "01:00:00", "+05", -300], ["1983-09-30T18:59:59+00:00", "23:59:59", "+05", -300], ["1983-09-30T19:00:00+00:00", "23:00:00", "+04", -240]]);
        helpers.testYear("Europe/Samara", [["1984-03-31T19:59:59+00:00", "23:59:59", "+04", -240], ["1984-03-31T20:00:00+00:00", "01:00:00", "+05", -300], ["1984-09-29T21:59:59+00:00", "02:59:59", "+05", -300], ["1984-09-29T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Europe/Samara", [["1985-03-30T21:59:59+00:00", "01:59:59", "+04", -240], ["1985-03-30T22:00:00+00:00", "03:00:00", "+05", -300], ["1985-09-28T21:59:59+00:00", "02:59:59", "+05", -300], ["1985-09-28T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Europe/Samara", [["1986-03-29T21:59:59+00:00", "01:59:59", "+04", -240], ["1986-03-29T22:00:00+00:00", "03:00:00", "+05", -300], ["1986-09-27T21:59:59+00:00", "02:59:59", "+05", -300], ["1986-09-27T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Europe/Samara", [["1987-03-28T21:59:59+00:00", "01:59:59", "+04", -240], ["1987-03-28T22:00:00+00:00", "03:00:00", "+05", -300], ["1987-09-26T21:59:59+00:00", "02:59:59", "+05", -300], ["1987-09-26T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Europe/Samara", [["1988-03-26T21:59:59+00:00", "01:59:59", "+04", -240], ["1988-03-26T22:00:00+00:00", "03:00:00", "+05", -300], ["1988-09-24T21:59:59+00:00", "02:59:59", "+05", -300], ["1988-09-24T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Europe/Samara", [["1989-03-25T21:59:59+00:00", "01:59:59", "+04", -240], ["1989-03-25T22:00:00+00:00", "02:00:00", "+04", -240], ["1989-09-23T22:59:59+00:00", "02:59:59", "+04", -240], ["1989-09-23T23:00:00+00:00", "02:00:00", "+03", -180]]);
        helpers.testYear("Europe/Samara", [["1990-03-24T22:59:59+00:00", "01:59:59", "+03", -180], ["1990-03-24T23:00:00+00:00", "03:00:00", "+04", -240], ["1990-09-29T22:59:59+00:00", "02:59:59", "+04", -240], ["1990-09-29T23:00:00+00:00", "02:00:00", "+03", -180]]);
        helpers.testYear("Europe/Samara", [["1991-03-30T22:59:59+00:00", "01:59:59", "+03", -180], ["1991-03-30T23:00:00+00:00", "02:00:00", "+03", -180], ["1991-09-28T23:59:59+00:00", "02:59:59", "+03", -180], ["1991-09-29T00:00:00+00:00", "03:00:00", "+03", -180], ["1991-10-19T23:59:59+00:00", "02:59:59", "+03", -180], ["1991-10-20T00:00:00+00:00", "04:00:00", "+04", -240]]);
        helpers.testYear("Europe/Samara", [["1992-03-28T21:59:59+00:00", "01:59:59", "+04", -240], ["1992-03-28T22:00:00+00:00", "03:00:00", "+05", -300], ["1992-09-26T21:59:59+00:00", "02:59:59", "+05", -300], ["1992-09-26T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Europe/Samara", [["1993-03-27T21:59:59+00:00", "01:59:59", "+04", -240], ["1993-03-27T22:00:00+00:00", "03:00:00", "+05", -300], ["1993-09-25T21:59:59+00:00", "02:59:59", "+05", -300], ["1993-09-25T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Europe/Samara", [["1994-03-26T21:59:59+00:00", "01:59:59", "+04", -240], ["1994-03-26T22:00:00+00:00", "03:00:00", "+05", -300], ["1994-09-24T21:59:59+00:00", "02:59:59", "+05", -300], ["1994-09-24T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Europe/Samara", [["1995-03-25T21:59:59+00:00", "01:59:59", "+04", -240], ["1995-03-25T22:00:00+00:00", "03:00:00", "+05", -300], ["1995-09-23T21:59:59+00:00", "02:59:59", "+05", -300], ["1995-09-23T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Europe/Samara", [["1996-03-30T21:59:59+00:00", "01:59:59", "+04", -240], ["1996-03-30T22:00:00+00:00", "03:00:00", "+05", -300], ["1996-10-26T21:59:59+00:00", "02:59:59", "+05", -300], ["1996-10-26T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Europe/Samara", [["1997-03-29T21:59:59+00:00", "01:59:59", "+04", -240], ["1997-03-29T22:00:00+00:00", "03:00:00", "+05", -300], ["1997-10-25T21:59:59+00:00", "02:59:59", "+05", -300], ["1997-10-25T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Europe/Samara", [["1998-03-28T21:59:59+00:00", "01:59:59", "+04", -240], ["1998-03-28T22:00:00+00:00", "03:00:00", "+05", -300], ["1998-10-24T21:59:59+00:00", "02:59:59", "+05", -300], ["1998-10-24T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Europe/Samara", [["1999-03-27T21:59:59+00:00", "01:59:59", "+04", -240], ["1999-03-27T22:00:00+00:00", "03:00:00", "+05", -300], ["1999-10-30T21:59:59+00:00", "02:59:59", "+05", -300], ["1999-10-30T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Europe/Samara", [["2000-03-25T21:59:59+00:00", "01:59:59", "+04", -240], ["2000-03-25T22:00:00+00:00", "03:00:00", "+05", -300], ["2000-10-28T21:59:59+00:00", "02:59:59", "+05", -300], ["2000-10-28T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Europe/Samara", [["2001-03-24T21:59:59+00:00", "01:59:59", "+04", -240], ["2001-03-24T22:00:00+00:00", "03:00:00", "+05", -300], ["2001-10-27T21:59:59+00:00", "02:59:59", "+05", -300], ["2001-10-27T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Europe/Samara", [["2002-03-30T21:59:59+00:00", "01:59:59", "+04", -240], ["2002-03-30T22:00:00+00:00", "03:00:00", "+05", -300], ["2002-10-26T21:59:59+00:00", "02:59:59", "+05", -300], ["2002-10-26T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Europe/Samara", [["2003-03-29T21:59:59+00:00", "01:59:59", "+04", -240], ["2003-03-29T22:00:00+00:00", "03:00:00", "+05", -300], ["2003-10-25T21:59:59+00:00", "02:59:59", "+05", -300], ["2003-10-25T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Europe/Samara", [["2004-03-27T21:59:59+00:00", "01:59:59", "+04", -240], ["2004-03-27T22:00:00+00:00", "03:00:00", "+05", -300], ["2004-10-30T21:59:59+00:00", "02:59:59", "+05", -300], ["2004-10-30T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Europe/Samara", [["2005-03-26T21:59:59+00:00", "01:59:59", "+04", -240], ["2005-03-26T22:00:00+00:00", "03:00:00", "+05", -300], ["2005-10-29T21:59:59+00:00", "02:59:59", "+05", -300], ["2005-10-29T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Europe/Samara", [["2006-03-25T21:59:59+00:00", "01:59:59", "+04", -240], ["2006-03-25T22:00:00+00:00", "03:00:00", "+05", -300], ["2006-10-28T21:59:59+00:00", "02:59:59", "+05", -300], ["2006-10-28T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Europe/Samara", [["2007-03-24T21:59:59+00:00", "01:59:59", "+04", -240], ["2007-03-24T22:00:00+00:00", "03:00:00", "+05", -300], ["2007-10-27T21:59:59+00:00", "02:59:59", "+05", -300], ["2007-10-27T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Europe/Samara", [["2008-03-29T21:59:59+00:00", "01:59:59", "+04", -240], ["2008-03-29T22:00:00+00:00", "03:00:00", "+05", -300], ["2008-10-25T21:59:59+00:00", "02:59:59", "+05", -300], ["2008-10-25T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Europe/Samara", [["2009-03-28T21:59:59+00:00", "01:59:59", "+04", -240], ["2009-03-28T22:00:00+00:00", "03:00:00", "+05", -300], ["2009-10-24T21:59:59+00:00", "02:59:59", "+05", -300], ["2009-10-24T22:00:00+00:00", "02:00:00", "+04", -240]]);
        helpers.testYear("Europe/Samara", [["2010-03-27T21:59:59+00:00", "01:59:59", "+04", -240], ["2010-03-27T22:00:00+00:00", "02:00:00", "+04", -240], ["2010-10-30T22:59:59+00:00", "02:59:59", "+04", -240], ["2010-10-30T23:00:00+00:00", "02:00:00", "+03", -180]]);
        helpers.testYear("Europe/Samara", [["2011-03-26T22:59:59+00:00", "01:59:59", "+03", -180], ["2011-03-26T23:00:00+00:00", "03:00:00", "+04", -240]]);
    });
});
