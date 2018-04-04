describe("math", "Decimal", function () {
    const {
        Decimal,
        assertException
    } = this;

    it("random", () => {
        let i;
        let sd;
        let r;

        const tx = (fn, msg) => {
            assertException(fn, msg);
        };

        const maxDigits = 100;

        for (i = 0; i < 996; i++) {
            sd = Math.random() * maxDigits + 1 | 0;

            if (Math.random() > 0.5) {
                Decimal.precision = sd;
                r = Decimal.random();
            } else {
                r = Decimal.random(sd);
            }

            assert(r.sd() <= sd && r.gte(0) && r.lt(1) && r.eq(r) && r.eq(r.valueOf()));
        }

        tx(() => {
            Decimal.random(Infinity);
        }, "Infinity");
        tx(() => {
            Decimal.random("-Infinity");
        }, "'-Infinity'");
        tx(() => {
            Decimal.random(NaN);
        }, "NaN");
        tx(() => {
            Decimal.random(null);
        }, "null");
    });
});
