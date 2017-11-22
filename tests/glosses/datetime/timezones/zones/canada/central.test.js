

import * as helpers from "../../helpers.js";
describe("datetime", "timezone", "zones", () => {
    before(() => {
        adone.datetime.tz.reload();
    });
    specify("Canada/Central", () => {
        helpers.testYear("Canada/Central", [["1916-04-23T05:59:59+00:00", "23:59:59", "CST", 360], ["1916-04-23T06:00:00+00:00", "01:00:00", "CDT", 300], ["1916-09-17T04:59:59+00:00", "23:59:59", "CDT", 300], ["1916-09-17T05:00:00+00:00", "23:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1918-04-14T07:59:59+00:00", "01:59:59", "CST", 360], ["1918-04-14T08:00:00+00:00", "03:00:00", "CDT", 300], ["1918-10-27T06:59:59+00:00", "01:59:59", "CDT", 300], ["1918-10-27T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1937-05-16T07:59:59+00:00", "01:59:59", "CST", 360], ["1937-05-16T08:00:00+00:00", "03:00:00", "CDT", 300], ["1937-09-26T06:59:59+00:00", "01:59:59", "CDT", 300], ["1937-09-26T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1942-02-09T07:59:59+00:00", "01:59:59", "CST", 360], ["1942-02-09T08:00:00+00:00", "03:00:00", "CWT", 300]]);
        helpers.testYear("Canada/Central", [["1945-08-14T22:59:59+00:00", "17:59:59", "CWT", 300], ["1945-08-14T23:00:00+00:00", "18:00:00", "CPT", 300], ["1945-09-30T06:59:59+00:00", "01:59:59", "CPT", 300], ["1945-09-30T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1946-05-12T07:59:59+00:00", "01:59:59", "CST", 360], ["1946-05-12T08:00:00+00:00", "03:00:00", "CDT", 300], ["1946-10-13T06:59:59+00:00", "01:59:59", "CDT", 300], ["1946-10-13T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1947-04-27T07:59:59+00:00", "01:59:59", "CST", 360], ["1947-04-27T08:00:00+00:00", "03:00:00", "CDT", 300], ["1947-09-28T06:59:59+00:00", "01:59:59", "CDT", 300], ["1947-09-28T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1948-04-25T07:59:59+00:00", "01:59:59", "CST", 360], ["1948-04-25T08:00:00+00:00", "03:00:00", "CDT", 300], ["1948-09-26T06:59:59+00:00", "01:59:59", "CDT", 300], ["1948-09-26T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1949-04-24T07:59:59+00:00", "01:59:59", "CST", 360], ["1949-04-24T08:00:00+00:00", "03:00:00", "CDT", 300], ["1949-09-25T06:59:59+00:00", "01:59:59", "CDT", 300], ["1949-09-25T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1950-05-01T07:59:59+00:00", "01:59:59", "CST", 360], ["1950-05-01T08:00:00+00:00", "03:00:00", "CDT", 300], ["1950-09-30T06:59:59+00:00", "01:59:59", "CDT", 300], ["1950-09-30T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1951-04-29T07:59:59+00:00", "01:59:59", "CST", 360], ["1951-04-29T08:00:00+00:00", "03:00:00", "CDT", 300], ["1951-09-30T06:59:59+00:00", "01:59:59", "CDT", 300], ["1951-09-30T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1952-04-27T07:59:59+00:00", "01:59:59", "CST", 360], ["1952-04-27T08:00:00+00:00", "03:00:00", "CDT", 300], ["1952-09-28T06:59:59+00:00", "01:59:59", "CDT", 300], ["1952-09-28T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1953-04-26T07:59:59+00:00", "01:59:59", "CST", 360], ["1953-04-26T08:00:00+00:00", "03:00:00", "CDT", 300], ["1953-09-27T06:59:59+00:00", "01:59:59", "CDT", 300], ["1953-09-27T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1954-04-25T07:59:59+00:00", "01:59:59", "CST", 360], ["1954-04-25T08:00:00+00:00", "03:00:00", "CDT", 300], ["1954-09-26T06:59:59+00:00", "01:59:59", "CDT", 300], ["1954-09-26T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1955-04-24T07:59:59+00:00", "01:59:59", "CST", 360], ["1955-04-24T08:00:00+00:00", "03:00:00", "CDT", 300], ["1955-09-25T06:59:59+00:00", "01:59:59", "CDT", 300], ["1955-09-25T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1956-04-29T07:59:59+00:00", "01:59:59", "CST", 360], ["1956-04-29T08:00:00+00:00", "03:00:00", "CDT", 300], ["1956-09-30T06:59:59+00:00", "01:59:59", "CDT", 300], ["1956-09-30T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1957-04-28T07:59:59+00:00", "01:59:59", "CST", 360], ["1957-04-28T08:00:00+00:00", "03:00:00", "CDT", 300], ["1957-09-29T06:59:59+00:00", "01:59:59", "CDT", 300], ["1957-09-29T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1958-04-27T07:59:59+00:00", "01:59:59", "CST", 360], ["1958-04-27T08:00:00+00:00", "03:00:00", "CDT", 300], ["1958-09-28T06:59:59+00:00", "01:59:59", "CDT", 300], ["1958-09-28T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1959-04-26T07:59:59+00:00", "01:59:59", "CST", 360], ["1959-04-26T08:00:00+00:00", "03:00:00", "CDT", 300], ["1959-10-25T06:59:59+00:00", "01:59:59", "CDT", 300], ["1959-10-25T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1960-04-24T07:59:59+00:00", "01:59:59", "CST", 360], ["1960-04-24T08:00:00+00:00", "03:00:00", "CDT", 300], ["1960-09-25T06:59:59+00:00", "01:59:59", "CDT", 300], ["1960-09-25T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1963-04-28T07:59:59+00:00", "01:59:59", "CST", 360], ["1963-04-28T08:00:00+00:00", "03:00:00", "CDT", 300], ["1963-09-22T06:59:59+00:00", "01:59:59", "CDT", 300], ["1963-09-22T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1966-04-24T07:59:59+00:00", "01:59:59", "CST", 360], ["1966-04-24T08:00:00+00:00", "03:00:00", "CDT", 300], ["1966-10-30T07:59:59+00:00", "02:59:59", "CDT", 300], ["1966-10-30T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1967-04-30T07:59:59+00:00", "01:59:59", "CST", 360], ["1967-04-30T08:00:00+00:00", "03:00:00", "CDT", 300], ["1967-10-29T07:59:59+00:00", "02:59:59", "CDT", 300], ["1967-10-29T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1968-04-28T07:59:59+00:00", "01:59:59", "CST", 360], ["1968-04-28T08:00:00+00:00", "03:00:00", "CDT", 300], ["1968-10-27T07:59:59+00:00", "02:59:59", "CDT", 300], ["1968-10-27T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1969-04-27T07:59:59+00:00", "01:59:59", "CST", 360], ["1969-04-27T08:00:00+00:00", "03:00:00", "CDT", 300], ["1969-10-26T07:59:59+00:00", "02:59:59", "CDT", 300], ["1969-10-26T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1970-04-26T07:59:59+00:00", "01:59:59", "CST", 360], ["1970-04-26T08:00:00+00:00", "03:00:00", "CDT", 300], ["1970-10-25T07:59:59+00:00", "02:59:59", "CDT", 300], ["1970-10-25T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1971-04-25T07:59:59+00:00", "01:59:59", "CST", 360], ["1971-04-25T08:00:00+00:00", "03:00:00", "CDT", 300], ["1971-10-31T07:59:59+00:00", "02:59:59", "CDT", 300], ["1971-10-31T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1972-04-30T07:59:59+00:00", "01:59:59", "CST", 360], ["1972-04-30T08:00:00+00:00", "03:00:00", "CDT", 300], ["1972-10-29T07:59:59+00:00", "02:59:59", "CDT", 300], ["1972-10-29T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1973-04-29T07:59:59+00:00", "01:59:59", "CST", 360], ["1973-04-29T08:00:00+00:00", "03:00:00", "CDT", 300], ["1973-10-28T07:59:59+00:00", "02:59:59", "CDT", 300], ["1973-10-28T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1974-04-28T07:59:59+00:00", "01:59:59", "CST", 360], ["1974-04-28T08:00:00+00:00", "03:00:00", "CDT", 300], ["1974-10-27T07:59:59+00:00", "02:59:59", "CDT", 300], ["1974-10-27T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1975-04-27T07:59:59+00:00", "01:59:59", "CST", 360], ["1975-04-27T08:00:00+00:00", "03:00:00", "CDT", 300], ["1975-10-26T07:59:59+00:00", "02:59:59", "CDT", 300], ["1975-10-26T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1976-04-25T07:59:59+00:00", "01:59:59", "CST", 360], ["1976-04-25T08:00:00+00:00", "03:00:00", "CDT", 300], ["1976-10-31T07:59:59+00:00", "02:59:59", "CDT", 300], ["1976-10-31T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1977-04-24T07:59:59+00:00", "01:59:59", "CST", 360], ["1977-04-24T08:00:00+00:00", "03:00:00", "CDT", 300], ["1977-10-30T07:59:59+00:00", "02:59:59", "CDT", 300], ["1977-10-30T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1978-04-30T07:59:59+00:00", "01:59:59", "CST", 360], ["1978-04-30T08:00:00+00:00", "03:00:00", "CDT", 300], ["1978-10-29T07:59:59+00:00", "02:59:59", "CDT", 300], ["1978-10-29T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1979-04-29T07:59:59+00:00", "01:59:59", "CST", 360], ["1979-04-29T08:00:00+00:00", "03:00:00", "CDT", 300], ["1979-10-28T07:59:59+00:00", "02:59:59", "CDT", 300], ["1979-10-28T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1980-04-27T07:59:59+00:00", "01:59:59", "CST", 360], ["1980-04-27T08:00:00+00:00", "03:00:00", "CDT", 300], ["1980-10-26T07:59:59+00:00", "02:59:59", "CDT", 300], ["1980-10-26T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1981-04-26T07:59:59+00:00", "01:59:59", "CST", 360], ["1981-04-26T08:00:00+00:00", "03:00:00", "CDT", 300], ["1981-10-25T07:59:59+00:00", "02:59:59", "CDT", 300], ["1981-10-25T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1982-04-25T07:59:59+00:00", "01:59:59", "CST", 360], ["1982-04-25T08:00:00+00:00", "03:00:00", "CDT", 300], ["1982-10-31T07:59:59+00:00", "02:59:59", "CDT", 300], ["1982-10-31T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1983-04-24T07:59:59+00:00", "01:59:59", "CST", 360], ["1983-04-24T08:00:00+00:00", "03:00:00", "CDT", 300], ["1983-10-30T07:59:59+00:00", "02:59:59", "CDT", 300], ["1983-10-30T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1984-04-29T07:59:59+00:00", "01:59:59", "CST", 360], ["1984-04-29T08:00:00+00:00", "03:00:00", "CDT", 300], ["1984-10-28T07:59:59+00:00", "02:59:59", "CDT", 300], ["1984-10-28T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1985-04-28T07:59:59+00:00", "01:59:59", "CST", 360], ["1985-04-28T08:00:00+00:00", "03:00:00", "CDT", 300], ["1985-10-27T07:59:59+00:00", "02:59:59", "CDT", 300], ["1985-10-27T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1986-04-27T07:59:59+00:00", "01:59:59", "CST", 360], ["1986-04-27T08:00:00+00:00", "03:00:00", "CDT", 300], ["1986-10-26T07:59:59+00:00", "02:59:59", "CDT", 300], ["1986-10-26T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1987-04-05T07:59:59+00:00", "01:59:59", "CST", 360], ["1987-04-05T08:00:00+00:00", "03:00:00", "CDT", 300], ["1987-10-25T07:59:59+00:00", "02:59:59", "CDT", 300], ["1987-10-25T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1988-04-03T07:59:59+00:00", "01:59:59", "CST", 360], ["1988-04-03T08:00:00+00:00", "03:00:00", "CDT", 300], ["1988-10-30T07:59:59+00:00", "02:59:59", "CDT", 300], ["1988-10-30T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1989-04-02T07:59:59+00:00", "01:59:59", "CST", 360], ["1989-04-02T08:00:00+00:00", "03:00:00", "CDT", 300], ["1989-10-29T07:59:59+00:00", "02:59:59", "CDT", 300], ["1989-10-29T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1990-04-01T07:59:59+00:00", "01:59:59", "CST", 360], ["1990-04-01T08:00:00+00:00", "03:00:00", "CDT", 300], ["1990-10-28T07:59:59+00:00", "02:59:59", "CDT", 300], ["1990-10-28T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1991-04-07T07:59:59+00:00", "01:59:59", "CST", 360], ["1991-04-07T08:00:00+00:00", "03:00:00", "CDT", 300], ["1991-10-27T07:59:59+00:00", "02:59:59", "CDT", 300], ["1991-10-27T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1992-04-05T07:59:59+00:00", "01:59:59", "CST", 360], ["1992-04-05T08:00:00+00:00", "03:00:00", "CDT", 300], ["1992-10-25T07:59:59+00:00", "02:59:59", "CDT", 300], ["1992-10-25T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1993-04-04T07:59:59+00:00", "01:59:59", "CST", 360], ["1993-04-04T08:00:00+00:00", "03:00:00", "CDT", 300], ["1993-10-31T07:59:59+00:00", "02:59:59", "CDT", 300], ["1993-10-31T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1994-04-03T07:59:59+00:00", "01:59:59", "CST", 360], ["1994-04-03T08:00:00+00:00", "03:00:00", "CDT", 300], ["1994-10-30T07:59:59+00:00", "02:59:59", "CDT", 300], ["1994-10-30T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1995-04-02T07:59:59+00:00", "01:59:59", "CST", 360], ["1995-04-02T08:00:00+00:00", "03:00:00", "CDT", 300], ["1995-10-29T07:59:59+00:00", "02:59:59", "CDT", 300], ["1995-10-29T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1996-04-07T07:59:59+00:00", "01:59:59", "CST", 360], ["1996-04-07T08:00:00+00:00", "03:00:00", "CDT", 300], ["1996-10-27T07:59:59+00:00", "02:59:59", "CDT", 300], ["1996-10-27T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1997-04-06T07:59:59+00:00", "01:59:59", "CST", 360], ["1997-04-06T08:00:00+00:00", "03:00:00", "CDT", 300], ["1997-10-26T07:59:59+00:00", "02:59:59", "CDT", 300], ["1997-10-26T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1998-04-05T07:59:59+00:00", "01:59:59", "CST", 360], ["1998-04-05T08:00:00+00:00", "03:00:00", "CDT", 300], ["1998-10-25T07:59:59+00:00", "02:59:59", "CDT", 300], ["1998-10-25T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["1999-04-04T07:59:59+00:00", "01:59:59", "CST", 360], ["1999-04-04T08:00:00+00:00", "03:00:00", "CDT", 300], ["1999-10-31T07:59:59+00:00", "02:59:59", "CDT", 300], ["1999-10-31T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2000-04-02T07:59:59+00:00", "01:59:59", "CST", 360], ["2000-04-02T08:00:00+00:00", "03:00:00", "CDT", 300], ["2000-10-29T07:59:59+00:00", "02:59:59", "CDT", 300], ["2000-10-29T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2001-04-01T07:59:59+00:00", "01:59:59", "CST", 360], ["2001-04-01T08:00:00+00:00", "03:00:00", "CDT", 300], ["2001-10-28T07:59:59+00:00", "02:59:59", "CDT", 300], ["2001-10-28T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2002-04-07T07:59:59+00:00", "01:59:59", "CST", 360], ["2002-04-07T08:00:00+00:00", "03:00:00", "CDT", 300], ["2002-10-27T07:59:59+00:00", "02:59:59", "CDT", 300], ["2002-10-27T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2003-04-06T07:59:59+00:00", "01:59:59", "CST", 360], ["2003-04-06T08:00:00+00:00", "03:00:00", "CDT", 300], ["2003-10-26T07:59:59+00:00", "02:59:59", "CDT", 300], ["2003-10-26T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2004-04-04T07:59:59+00:00", "01:59:59", "CST", 360], ["2004-04-04T08:00:00+00:00", "03:00:00", "CDT", 300], ["2004-10-31T07:59:59+00:00", "02:59:59", "CDT", 300], ["2004-10-31T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2005-04-03T07:59:59+00:00", "01:59:59", "CST", 360], ["2005-04-03T08:00:00+00:00", "03:00:00", "CDT", 300], ["2005-10-30T07:59:59+00:00", "02:59:59", "CDT", 300], ["2005-10-30T08:00:00+00:00", "02:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2006-04-02T07:59:59+00:00", "01:59:59", "CST", 360], ["2006-04-02T08:00:00+00:00", "03:00:00", "CDT", 300], ["2006-10-29T06:59:59+00:00", "01:59:59", "CDT", 300], ["2006-10-29T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2007-03-11T07:59:59+00:00", "01:59:59", "CST", 360], ["2007-03-11T08:00:00+00:00", "03:00:00", "CDT", 300], ["2007-11-04T06:59:59+00:00", "01:59:59", "CDT", 300], ["2007-11-04T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2008-03-09T07:59:59+00:00", "01:59:59", "CST", 360], ["2008-03-09T08:00:00+00:00", "03:00:00", "CDT", 300], ["2008-11-02T06:59:59+00:00", "01:59:59", "CDT", 300], ["2008-11-02T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2009-03-08T07:59:59+00:00", "01:59:59", "CST", 360], ["2009-03-08T08:00:00+00:00", "03:00:00", "CDT", 300], ["2009-11-01T06:59:59+00:00", "01:59:59", "CDT", 300], ["2009-11-01T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2010-03-14T07:59:59+00:00", "01:59:59", "CST", 360], ["2010-03-14T08:00:00+00:00", "03:00:00", "CDT", 300], ["2010-11-07T06:59:59+00:00", "01:59:59", "CDT", 300], ["2010-11-07T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2011-03-13T07:59:59+00:00", "01:59:59", "CST", 360], ["2011-03-13T08:00:00+00:00", "03:00:00", "CDT", 300], ["2011-11-06T06:59:59+00:00", "01:59:59", "CDT", 300], ["2011-11-06T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2012-03-11T07:59:59+00:00", "01:59:59", "CST", 360], ["2012-03-11T08:00:00+00:00", "03:00:00", "CDT", 300], ["2012-11-04T06:59:59+00:00", "01:59:59", "CDT", 300], ["2012-11-04T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2013-03-10T07:59:59+00:00", "01:59:59", "CST", 360], ["2013-03-10T08:00:00+00:00", "03:00:00", "CDT", 300], ["2013-11-03T06:59:59+00:00", "01:59:59", "CDT", 300], ["2013-11-03T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2014-03-09T07:59:59+00:00", "01:59:59", "CST", 360], ["2014-03-09T08:00:00+00:00", "03:00:00", "CDT", 300], ["2014-11-02T06:59:59+00:00", "01:59:59", "CDT", 300], ["2014-11-02T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2015-03-08T07:59:59+00:00", "01:59:59", "CST", 360], ["2015-03-08T08:00:00+00:00", "03:00:00", "CDT", 300], ["2015-11-01T06:59:59+00:00", "01:59:59", "CDT", 300], ["2015-11-01T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2016-03-13T07:59:59+00:00", "01:59:59", "CST", 360], ["2016-03-13T08:00:00+00:00", "03:00:00", "CDT", 300], ["2016-11-06T06:59:59+00:00", "01:59:59", "CDT", 300], ["2016-11-06T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2017-03-12T07:59:59+00:00", "01:59:59", "CST", 360], ["2017-03-12T08:00:00+00:00", "03:00:00", "CDT", 300], ["2017-11-05T06:59:59+00:00", "01:59:59", "CDT", 300], ["2017-11-05T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2018-03-11T07:59:59+00:00", "01:59:59", "CST", 360], ["2018-03-11T08:00:00+00:00", "03:00:00", "CDT", 300], ["2018-11-04T06:59:59+00:00", "01:59:59", "CDT", 300], ["2018-11-04T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2019-03-10T07:59:59+00:00", "01:59:59", "CST", 360], ["2019-03-10T08:00:00+00:00", "03:00:00", "CDT", 300], ["2019-11-03T06:59:59+00:00", "01:59:59", "CDT", 300], ["2019-11-03T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2020-03-08T07:59:59+00:00", "01:59:59", "CST", 360], ["2020-03-08T08:00:00+00:00", "03:00:00", "CDT", 300], ["2020-11-01T06:59:59+00:00", "01:59:59", "CDT", 300], ["2020-11-01T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2021-03-14T07:59:59+00:00", "01:59:59", "CST", 360], ["2021-03-14T08:00:00+00:00", "03:00:00", "CDT", 300], ["2021-11-07T06:59:59+00:00", "01:59:59", "CDT", 300], ["2021-11-07T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2022-03-13T07:59:59+00:00", "01:59:59", "CST", 360], ["2022-03-13T08:00:00+00:00", "03:00:00", "CDT", 300], ["2022-11-06T06:59:59+00:00", "01:59:59", "CDT", 300], ["2022-11-06T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2023-03-12T07:59:59+00:00", "01:59:59", "CST", 360], ["2023-03-12T08:00:00+00:00", "03:00:00", "CDT", 300], ["2023-11-05T06:59:59+00:00", "01:59:59", "CDT", 300], ["2023-11-05T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2024-03-10T07:59:59+00:00", "01:59:59", "CST", 360], ["2024-03-10T08:00:00+00:00", "03:00:00", "CDT", 300], ["2024-11-03T06:59:59+00:00", "01:59:59", "CDT", 300], ["2024-11-03T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2025-03-09T07:59:59+00:00", "01:59:59", "CST", 360], ["2025-03-09T08:00:00+00:00", "03:00:00", "CDT", 300], ["2025-11-02T06:59:59+00:00", "01:59:59", "CDT", 300], ["2025-11-02T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2026-03-08T07:59:59+00:00", "01:59:59", "CST", 360], ["2026-03-08T08:00:00+00:00", "03:00:00", "CDT", 300], ["2026-11-01T06:59:59+00:00", "01:59:59", "CDT", 300], ["2026-11-01T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2027-03-14T07:59:59+00:00", "01:59:59", "CST", 360], ["2027-03-14T08:00:00+00:00", "03:00:00", "CDT", 300], ["2027-11-07T06:59:59+00:00", "01:59:59", "CDT", 300], ["2027-11-07T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2028-03-12T07:59:59+00:00", "01:59:59", "CST", 360], ["2028-03-12T08:00:00+00:00", "03:00:00", "CDT", 300], ["2028-11-05T06:59:59+00:00", "01:59:59", "CDT", 300], ["2028-11-05T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2029-03-11T07:59:59+00:00", "01:59:59", "CST", 360], ["2029-03-11T08:00:00+00:00", "03:00:00", "CDT", 300], ["2029-11-04T06:59:59+00:00", "01:59:59", "CDT", 300], ["2029-11-04T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2030-03-10T07:59:59+00:00", "01:59:59", "CST", 360], ["2030-03-10T08:00:00+00:00", "03:00:00", "CDT", 300], ["2030-11-03T06:59:59+00:00", "01:59:59", "CDT", 300], ["2030-11-03T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2031-03-09T07:59:59+00:00", "01:59:59", "CST", 360], ["2031-03-09T08:00:00+00:00", "03:00:00", "CDT", 300], ["2031-11-02T06:59:59+00:00", "01:59:59", "CDT", 300], ["2031-11-02T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2032-03-14T07:59:59+00:00", "01:59:59", "CST", 360], ["2032-03-14T08:00:00+00:00", "03:00:00", "CDT", 300], ["2032-11-07T06:59:59+00:00", "01:59:59", "CDT", 300], ["2032-11-07T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2033-03-13T07:59:59+00:00", "01:59:59", "CST", 360], ["2033-03-13T08:00:00+00:00", "03:00:00", "CDT", 300], ["2033-11-06T06:59:59+00:00", "01:59:59", "CDT", 300], ["2033-11-06T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2034-03-12T07:59:59+00:00", "01:59:59", "CST", 360], ["2034-03-12T08:00:00+00:00", "03:00:00", "CDT", 300], ["2034-11-05T06:59:59+00:00", "01:59:59", "CDT", 300], ["2034-11-05T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2035-03-11T07:59:59+00:00", "01:59:59", "CST", 360], ["2035-03-11T08:00:00+00:00", "03:00:00", "CDT", 300], ["2035-11-04T06:59:59+00:00", "01:59:59", "CDT", 300], ["2035-11-04T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2036-03-09T07:59:59+00:00", "01:59:59", "CST", 360], ["2036-03-09T08:00:00+00:00", "03:00:00", "CDT", 300], ["2036-11-02T06:59:59+00:00", "01:59:59", "CDT", 300], ["2036-11-02T07:00:00+00:00", "01:00:00", "CST", 360]]);
        helpers.testYear("Canada/Central", [["2037-03-08T07:59:59+00:00", "01:59:59", "CST", 360], ["2037-03-08T08:00:00+00:00", "03:00:00", "CDT", 300], ["2037-11-01T06:59:59+00:00", "01:59:59", "CDT", 300], ["2037-11-01T07:00:00+00:00", "01:00:00", "CST", 360]]);
    });
});
