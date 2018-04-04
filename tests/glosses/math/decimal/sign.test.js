describe("math", "Decimal", function () {
    const {
        Decimal,
        assertEqual
    } = this;

    it("sign", () => {

        const t = (n, expected) => {
            assertEqual(expected, Decimal.sign(n));
        };

        t(NaN, NaN);
        t("NaN", NaN);
        t(Infinity, 1);
        t(-Infinity, -1);
        t("Infinity", 1);
        t("-Infinity", -1);

        assert(1 / Decimal.sign("0") === Infinity);
        assert(1 / Decimal.sign(new Decimal("0")) === Infinity);
        assert(1 / Decimal.sign("-0") === -Infinity);
        assert(1 / Decimal.sign(new Decimal("-0")) === -Infinity);

        t("0", 0);
        t("-0", -0);
        t("1", 1);
        t("-1", -1);
        t("9.99", 1);
        t("-9.99", -1);
    });
});

