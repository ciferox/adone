describe("string prototype", () => {
    before(() => {
        adone.date.locale("en");
    });

    const prior = String.prototype.call;

    beforeEach(() => {
        String.prototype.call = function () {
            return null;
        };
    });

    afterEach(() => {
        String.prototype.call = prior;
    });

    it("string prototype overrides call", () => {
        const b = adone.date(new Date(2011, 7, 28, 15, 25, 50, 125));
        assert.equal(b.format("MMMM Do YYYY, h:mm a"), "August 28th 2011, 3:25 pm");
    });
});
