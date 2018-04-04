describe("math", "Decimal", function () {
    const {
        is
    } = adone;
    const {
        Decimal,
        assertException
    } = this;

    it("clone", () => {
        const t = (expression) => {
            assert(expression);
        };

        Decimal.config({
            precision: 10,
            rounding: 4,
            toExpNeg: -7,
            toExpPos: 21,
            minE: -9e15,
            maxE: 9e15
        });

        let D1 = Decimal.clone({ precision: 1 });
        let D2 = Decimal.clone({ precision: 2 });
        let D3 = Decimal.clone({ precision: 3 });
        const D4 = Decimal.clone({ precision: 4 });
        const D5 = Decimal.clone({ precision: 5 });
        const D6 = Decimal.clone({ precision: 6 });
        const D7 = Decimal.clone({ precision: 7 });
        const D8 = Decimal.clone();
        D8.config({ precision: 8 });
        const D9 = Decimal.clone({ precision: 9 });

        t(Decimal !== D9);

        const x = new Decimal(5);
        const x1 = new D1(5);
        const x2 = new D2(5);
        const x3 = new D3(5);
        const x4 = new D4(5);
        const x5 = new D5(5);
        const x6 = new D6(5);
        const x7 = new D7(5);
        const x8 = new D8(5);
        const x9 = new D9(5);

        t(x1.div(3).eq(2));
        t(x2.div(3).eq(1.7));
        t(x3.div(3).eq(1.67));
        t(x4.div(3).eq(1.667));
        t(x5.div(3).eq(1.6667));
        t(x6.div(3).eq(1.66667));
        t(x7.div(3).eq(1.666667));
        t(x8.div(3).eq(1.6666667));
        t(x9.div(3).eq(1.66666667));
        t(x .div(3).eq(1.666666667));

        const y = new Decimal(3);
        const y1 = new D1(3);
        const y2 = new D2(3);
        const y3 = new D3(3);
        const y4 = new D4(3);
        const y5 = new D5(3);
        const y6 = new D6(3);
        const y7 = new D7(3);
        const y8 = new D8(3);
        const y9 = new D9(3);

        t(x1.div(y1).eq(2));
        t(x2.div(y2).eq(1.7));
        t(x3.div(y3).eq(1.67));
        t(x4.div(y4).eq(1.667));
        t(x5.div(y5).eq(1.6667));
        t(x6.div(y6).eq(1.66667));
        t(x7.div(y7).eq(1.666667));
        t(x8.div(y8).eq(1.6666667));
        t(x9.div(y9).eq(1.66666667));
        t(x .div(y ).eq(1.666666667));

        t(x1.div(y9).eq(2));
        t(x2.div(y8).eq(1.7));
        t(x3.div(y7).eq(1.67));
        t(x4.div(y6).eq(1.667));
        t(x5.div(y5).eq(1.6667));
        t(x6.div(y4).eq(1.66667));
        t(x7.div(y3).eq(1.666667));
        t(x8.div(y2).eq(1.6666667));
        t(x9.div(y1).eq(1.66666667));

        t(Decimal.precision == 10);
        t(D9.precision === 9);
        t(D8.precision === 8);
        t(D7.precision === 7);
        t(D6.precision === 6);
        t(D5.precision === 5);
        t(D4.precision === 4);
        t(D3.precision === 3);
        t(D2.precision === 2);
        t(D1.precision === 1);

        t(new Decimal(9.99).eq(new D5("9.99")));
        t(!new Decimal(9.99).eq(new D3("-9.99")));
        t(!new Decimal(123.456789).toSD().eq(new D3("123.456789").toSD()));
        t(new Decimal(123.456789).round().eq(new D3("123.456789").round()));

        t(new Decimal(1).constructor === new Decimal(1).constructor);
        t(new D9(1).constructor === new D9(1).constructor);
        t(new Decimal(1).constructor !== new D1(1).constructor);
        t(new D8(1).constructor !== new D9(1).constructor);

        assertException(() => {
            Decimal.clone(null);
        }, "Decimal.clone(null)");

        // defaults: true

        Decimal.config({
            precision: 100,
            rounding: 2,
            toExpNeg: -100,
            toExpPos: 200,
            defaults: true
        });

        t(Decimal.precision === 100);
        t(Decimal.rounding === 2);
        t(Decimal.toExpNeg === -100);
        t(Decimal.toExpPos === 200);
        t(is.undefined(Decimal.defaults));

        D1 = Decimal.clone({ defaults: true });

        t(D1.precision === 20);
        t(D1.rounding === 4);
        t(D1.toExpNeg === -7);
        t(D1.toExpPos === 21);
        t(is.undefined(D1.defaults));

        D2 = Decimal.clone({ defaults: true, rounding: 5 });

        t(D2.precision === 20);
        t(D2.rounding === 5);
        t(D2.toExpNeg === -7);
        t(D2.toExpPos === 21);

        D3 = Decimal.clone({ defaults: false });

        t(D3.rounding === 2);
    });
});


