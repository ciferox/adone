describe("datetime", "weeks in year", () => {
    before(() => {
        adone.datetime.locale("en");
    });

    it("isoWeeksInYear", () => {
        assert.equal(adone.datetime([2004]).isoWeeksInYear(), 53, "2004 has 53 iso weeks");
        assert.equal(adone.datetime([2005]).isoWeeksInYear(), 52, "2005 has 53 iso weeks");
        assert.equal(adone.datetime([2006]).isoWeeksInYear(), 52, "2006 has 53 iso weeks");
        assert.equal(adone.datetime([2007]).isoWeeksInYear(), 52, "2007 has 52 iso weeks");
        assert.equal(adone.datetime([2008]).isoWeeksInYear(), 52, "2008 has 53 iso weeks");
        assert.equal(adone.datetime([2009]).isoWeeksInYear(), 53, "2009 has 53 iso weeks");
        assert.equal(adone.datetime([2010]).isoWeeksInYear(), 52, "2010 has 52 iso weeks");
        assert.equal(adone.datetime([2011]).isoWeeksInYear(), 52, "2011 has 52 iso weeks");
        assert.equal(adone.datetime([2012]).isoWeeksInYear(), 52, "2012 has 52 iso weeks");
        assert.equal(adone.datetime([2013]).isoWeeksInYear(), 52, "2013 has 52 iso weeks");
        assert.equal(adone.datetime([2014]).isoWeeksInYear(), 52, "2014 has 52 iso weeks");
        assert.equal(adone.datetime([2015]).isoWeeksInYear(), 53, "2015 has 53 iso weeks");
    });

    it("weeksInYear doy/dow = 1/4", () => {
        adone.datetime.locale("1/4", { week: { dow: 1, doy: 4 } });

        assert.equal(adone.datetime([2004]).weeksInYear(), 53, "2004 has 53 weeks");
        assert.equal(adone.datetime([2005]).weeksInYear(), 52, "2005 has 53 weeks");
        assert.equal(adone.datetime([2006]).weeksInYear(), 52, "2006 has 53 weeks");
        assert.equal(adone.datetime([2007]).weeksInYear(), 52, "2007 has 52 weeks");
        assert.equal(adone.datetime([2008]).weeksInYear(), 52, "2008 has 53 weeks");
        assert.equal(adone.datetime([2009]).weeksInYear(), 53, "2009 has 53 weeks");
        assert.equal(adone.datetime([2010]).weeksInYear(), 52, "2010 has 52 weeks");
        assert.equal(adone.datetime([2011]).weeksInYear(), 52, "2011 has 52 weeks");
        assert.equal(adone.datetime([2012]).weeksInYear(), 52, "2012 has 52 weeks");
        assert.equal(adone.datetime([2013]).weeksInYear(), 52, "2013 has 52 weeks");
        assert.equal(adone.datetime([2014]).weeksInYear(), 52, "2014 has 52 weeks");
        assert.equal(adone.datetime([2015]).weeksInYear(), 53, "2015 has 53 weeks");
    });

    it("weeksInYear doy/dow = 6/12", () => {
        adone.datetime.locale("6/12", { week: { dow: 6, doy: 12 } });

        assert.equal(adone.datetime([2004]).weeksInYear(), 53, "2004 has 53 weeks");
        assert.equal(adone.datetime([2005]).weeksInYear(), 52, "2005 has 53 weeks");
        assert.equal(adone.datetime([2006]).weeksInYear(), 52, "2006 has 53 weeks");
        assert.equal(adone.datetime([2007]).weeksInYear(), 52, "2007 has 52 weeks");
        assert.equal(adone.datetime([2008]).weeksInYear(), 52, "2008 has 53 weeks");
        assert.equal(adone.datetime([2009]).weeksInYear(), 52, "2009 has 53 weeks");
        assert.equal(adone.datetime([2010]).weeksInYear(), 53, "2010 has 52 weeks");
        assert.equal(adone.datetime([2011]).weeksInYear(), 52, "2011 has 52 weeks");
        assert.equal(adone.datetime([2012]).weeksInYear(), 52, "2012 has 52 weeks");
        assert.equal(adone.datetime([2013]).weeksInYear(), 52, "2013 has 52 weeks");
        assert.equal(adone.datetime([2014]).weeksInYear(), 52, "2014 has 52 weeks");
        assert.equal(adone.datetime([2015]).weeksInYear(), 52, "2015 has 53 weeks");
    });

    it("weeksInYear doy/dow = 1/7", () => {
        adone.datetime.locale("1/7", { week: { dow: 1, doy: 7 } });

        assert.equal(adone.datetime([2004]).weeksInYear(), 52, "2004 has 53 weeks");
        assert.equal(adone.datetime([2005]).weeksInYear(), 52, "2005 has 53 weeks");
        assert.equal(adone.datetime([2006]).weeksInYear(), 53, "2006 has 53 weeks");
        assert.equal(adone.datetime([2007]).weeksInYear(), 52, "2007 has 52 weeks");
        assert.equal(adone.datetime([2008]).weeksInYear(), 52, "2008 has 53 weeks");
        assert.equal(adone.datetime([2009]).weeksInYear(), 52, "2009 has 53 weeks");
        assert.equal(adone.datetime([2010]).weeksInYear(), 52, "2010 has 52 weeks");
        assert.equal(adone.datetime([2011]).weeksInYear(), 52, "2011 has 52 weeks");
        assert.equal(adone.datetime([2012]).weeksInYear(), 53, "2012 has 52 weeks");
        assert.equal(adone.datetime([2013]).weeksInYear(), 52, "2013 has 52 weeks");
        assert.equal(adone.datetime([2014]).weeksInYear(), 52, "2014 has 52 weeks");
        assert.equal(adone.datetime([2015]).weeksInYear(), 52, "2015 has 53 weeks");
    });

    it("weeksInYear doy/dow = 0/6", () => {
        adone.datetime.locale("0/6", { week: { dow: 0, doy: 6 } });

        assert.equal(adone.datetime([2004]).weeksInYear(), 52, "2004 has 53 weeks");
        assert.equal(adone.datetime([2005]).weeksInYear(), 53, "2005 has 53 weeks");
        assert.equal(adone.datetime([2006]).weeksInYear(), 52, "2006 has 53 weeks");
        assert.equal(adone.datetime([2007]).weeksInYear(), 52, "2007 has 52 weeks");
        assert.equal(adone.datetime([2008]).weeksInYear(), 52, "2008 has 53 weeks");
        assert.equal(adone.datetime([2009]).weeksInYear(), 52, "2009 has 53 weeks");
        assert.equal(adone.datetime([2010]).weeksInYear(), 52, "2010 has 52 weeks");
        assert.equal(adone.datetime([2011]).weeksInYear(), 53, "2011 has 52 weeks");
        assert.equal(adone.datetime([2012]).weeksInYear(), 52, "2012 has 52 weeks");
        assert.equal(adone.datetime([2013]).weeksInYear(), 52, "2013 has 52 weeks");
        assert.equal(adone.datetime([2014]).weeksInYear(), 52, "2014 has 52 weeks");
        assert.equal(adone.datetime([2015]).weeksInYear(), 52, "2015 has 53 weeks");
    });
});
