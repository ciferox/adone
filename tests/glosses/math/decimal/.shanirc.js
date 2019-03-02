export default (ctx) => {
    ctx.runtime.assertEqualProps = (digits, exponent, sign, n) => {
        let i = 0;
        const len = digits.length;
        while (i < len && digits[i] === n.d[i]) {
            ++i;
        }
        assert.equal(i, len);
        assert.equal(i, n.d.length);
        assert.equal(exponent, n.e);
        assert.equal(sign, n.s);
    };

    ctx.runtime.assertEqual = (expected, actual) => {
        assert.isTrue(expected === actual || expected !== expected && actual !== actual);
    };

    ctx.runtime.assertException = (func, msg) => {
        let actual;
        try {
            func();
        } catch (e) {
            actual = e;
        }
        assert(actual instanceof Error, msg);
        assert.include(actual.message, "DecimalError", msg);
    };

    ctx.runtime.assertEqualDecimal = function (x, y) {
        assert(x.eq(y) || x.isNaN() && y.isNaN());
    };

    ctx.runtime.Decimal = adone.math.Decimal;
};
