describe("math", "Decimal", function () {
    const {
        Decimal,
        assertEqual
    } = this;

    it("toNearest", () => {
        const isMinusZero = (n) => {
            return n.isZero() && n.isNegative();
        };

        Decimal.config({
            precision: 20,
            rounding: 4,
            toExpNeg: -9e15,
            toExpPos: 9e15,
            minE: -9e15,
            maxE: 9e15
        });

        let t = function (actual) {
            assert(actual);
        };

        t(!isMinusZero(new Decimal(0).toNearest(0)));
        t( isMinusZero(new Decimal(-1).toNearest(0)));
        t( isMinusZero(new Decimal(-0).toNearest(0)));
        t(!isMinusZero(new Decimal(1).toNearest(0)));
        t(!isMinusZero(new Decimal(1).toNearest(-0)));
        t(!isMinusZero(new Decimal(1).toNearest(-3)));
        t( isMinusZero(new Decimal(-1).toNearest(-3)));

        t = function (expected, n, v, rm) {
            assertEqual(expected, new Decimal(n).toNearest(v, rm).valueOf());
        };

        t("Infinity", Infinity);
        t("-Infinity", -Infinity);
        t("NaN", NaN);
        t("NaN", NaN, NaN);
        t("NaN", NaN, Infinity);
        t("NaN", NaN, -Infinity);
        t("NaN", NaN, 0);
        t("NaN", NaN, -0);

        t("Infinity", "9.999e+9000000000000000", "1e+9000000000000001");
        t("Infinity", "9.999e+9000000000000000", "-1e+9000000000000001");
        t("-Infinity", "-9.999e+9000000000000000", "1e+9000000000000001");
        t("-Infinity", "-9.999e+9000000000000000", "-1e+9000000000000001");
        t("9.999e+9000000000000000", "9.999e+9000000000000000");
        t("-9.999e+9000000000000000", "-9.999e+9000000000000000");

        t("NaN", 123.456, NaN);
        t("Infinity", 123.456, Infinity);
        t("Infinity", 123.456, -Infinity);
        t("0", 123.456, 0);
        t("0", 123.456, "-0");

        t("NaN", -123.456, NaN);
        t("-Infinity", -123.456, Infinity);
        t("-Infinity", -123.456, -Infinity);
        t("-0", -123.456, "-0");

        t("0", 0, 0);
        t("Infinity", 0, Infinity);
        t("Infinity", 0, -Infinity);
        t("-Infinity", -0, Infinity);
        t("-Infinity", -0, -Infinity);

        t("0", 1, -3);
        t("-0", -1, -3);
        t("3", 1.5, -3, 0);
        t("-0", -1.5, -3, 1);
        t("-3", -1.5, -3, 2);

        t("123", 123.456);
        t("123", 123.456, 1);
        t("123.5", 123.456, 0.1);
        t("123.46", 123.456, 0.01);
        t("123.456", 123.456, 0.001);

        t("123", 123.456, -1);
        t("123.5", 123.456, -0.1);
        t("123.46", 123.456, -0.01);
        t("123.456", 123.456, -0.001);

        t("124", 123.456, "-2");
        t("123.4", 123.456, "-0.2");
        t("123.46", 123.456, "-0.02");
        t("123.456", 123.456, "-0.002");

        t("83105511540", "83105511539.5", 1, 4);
        t("83105511539", "83105511539.499999999999999999999999999999", 1, 4);
        t("83105511539", "83105511539.5", "1", 5);
        t("83105511540", "83105511539.5000000000000000000001", 1, 5);

        Decimal.precision = 3;

        t("83105511540", "83105511539.5", new Decimal(1), 4);
        t("83105511539", "83105511539.499999999999999999999999999999", 1, 4);
        t("83105511539", "83105511539.5", new Decimal("1"), 5);
        t("83105511540", "83105511539.5000000000000000000001", 1, 5);

        Decimal.precision = 20;

        t("83105511540", "83105511539.5", -1, 4);
        t("83105511539", "83105511539.499999999999999999999999999999", -1, 4);
        t("83105511539", "83105511539.5", "-1", 5);
        t("83105511540", "83105511539.5000000000000000000001", -1, 5);

        t("-83105511540", "-83105511539.5", new Decimal(-1), 4);
        t("-83105511539", "-83105511539.499999999999999999999999999999", 1, 4);
        t("-83105511539", "-83105511539.5", new Decimal("-1"), 5);
        t("-83105511540", "-83105511539.5000000000000000000001", -1, 5);

        t("83105511540", "83105511539.5", 1, 0);
        t("83105511539", "83105511539.5", 1, 1);
        t("83105511540", "83105511539.5", 1, 2);
        t("83105511539", "83105511539.5", 1, 3);
        t("83105511540", "83105511539.5", 1, 4);
        t("83105511539", "83105511539.5", 1, 5);
        t("83105511540", "83105511539.5", 1, 6);
        t("83105511540", "83105511539.5", 1, 7);
        t("83105511539", "83105511539.5", 1, 8);
        t("83105511539", "83105511539.499999999999999999999999999999", void 0, 0);
        t("83105511539", "83105511539.499999999999999999999999999999", 1, 1);
        t("83105511539", "83105511539.499999999999999999999999999999", void 0, 2);
        t("83105511539", "83105511539.499999999999999999999999999999", 1, 3);
        t("83105511539", "83105511539.499999999999999999999999999999", void 0, 4);
        t("83105511539", "83105511539.499999999999999999999999999999", 1, 5);
        t("83105511539", "83105511539.499999999999999999999999999999", void 0, 6);
        t("83105511539", "83105511539.499999999999999999999999999999", 1, 7);
        t("83105511539", "83105511539.499999999999999999999999999999", void 0, 8);
        t("83105511540", "83105511539.5000000000000000000001", void 0, 0);
        t("83105511539", "83105511539.5000000000000000000001", 1, 1);
        t("83105511540", "83105511539.5000000000000000000001", void 0, 2);
        t("83105511539", "83105511539.5000000000000000000001", 1, 3);
        t("83105511540", "83105511539.5000000000000000000001", void 0, 4);
        t("83105511540", "83105511539.5000000000000000000001", 1, 5);
        t("83105511540", "83105511539.5000000000000000000001", void 0, 6);
        t("83105511540", "83105511539.5000000000000000000001", 1, 7);
        t("83105511540", "83105511539.5000000000000000000001", void 0, 8);

        Decimal.rounding = 0;
        t("83105511540", "83105511539.5");

        Decimal.rounding = 1;
        t("83105511539", "83105511539.5");

        t("3847570", "3847561.00000749", 10, 0);
        t("42840000000000000", "42835000000000001", "1e+13", 0);
        t("42830000000000000", "42835000000000001", "1e+13", 1);
        t("42840000000000000", "42835000000000000.0002", "1e+13", 0);
        t("42830000000000000", "42835000000000000.0002", "1e+13", 1);

        t("500", "449.999", 100, 0);
        t("400", "449.999", 100, 1);
        t("500", "449.999", 100, 2);
        t("400", "449.999", 100, 3);
        t("400", "449.999", 100, 4);
        t("400", "449.999", 100, 5);
        t("400", "449.999", 100, 6);
        t("400", "449.999", 100, 7);
        t("400", "449.999", 100, 8);

        t("-500", "-449.999", 100, 0);
        t("-400", "-449.999", 100, 1);
        t("-400", "-449.999", 100, 2);
        t("-500", "-449.999", 100, 3);
        t("-400", "-449.999", 100, 4);
        t("-400", "-449.999", 100, 5);
        t("-400", "-449.999", 100, 6);
        t("-400", "-449.999", 100, 7);
        t("-400", "-449.999", 100, 8);

        t("500", "450", 100, 0);
        t("400", "450", 100, 1);
        t("500", "450", 100, 2);
        t("400", "450", 100, 3);
        t("500", "450", 100, 4);
        t("400", "450", 100, 5);
        t("400", "450", 100, 6);
        t("500", "450", 100, 7);
        t("400", "450", 100, 8);

        t("-500", "-450", 100, 0);
        t("-400", "-450", 100, 1);
        t("-400", "-450", 100, 2);
        t("-500", "-450", 100, 3);
        t("-500", "-450", 100, 4);
        t("-400", "-450", 100, 5);
        t("-400", "-450", 100, 6);
        t("-400", "-450", 100, 7);
        t("-500", "-450", 100, 8);

        Decimal.rounding = 0;
        t("500", "450.001", 100);
        Decimal.rounding = 1;
        t("400", "450.001", 100);
        Decimal.rounding = 2;
        t("500", "450.001", 100);
        Decimal.rounding = 3;
        t("400", "450.001", 100);
        Decimal.rounding = 4;
        t("500", "450.001", 100);
        Decimal.rounding = 5;
        t("500", "450.001", 100);
        Decimal.rounding = 6;
        t("500", "450.001", 100);
        Decimal.rounding = 7;
        t("500", "450.001", 100);
        Decimal.rounding = 8;
        t("500", "450.001", 100);

        Decimal.rounding = 0;
        t("-500", "-450.001", 100);
        Decimal.rounding = 1;
        t("-400", "-450.001", 100);
        Decimal.rounding = 2;
        t("-400", "-450.001", 100);
        Decimal.rounding = 3;
        t("-500", "-450.001", 100);
        Decimal.rounding = 4;
        t("-500", "-450.001", 100);
        Decimal.rounding = 5;
        t("-500", "-450.001", 100);
        Decimal.rounding = 6;
        t("-500", "-450.001", 100);
        Decimal.rounding = 7;
        t("-500", "-450.001", 100);
        Decimal.rounding = 8;
        t("-500", "-450.001", 100);
    });
});