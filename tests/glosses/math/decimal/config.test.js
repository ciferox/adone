describe("math", "Decimal", function () {
    const {
        is
    } = adone;
    const {
        Decimal,
        assertException,
        assertEqual
    } = this;

    it("config", () => {

        const MAX_DIGITS = 1e9;
        const EXP_LIMIT = 9e15;

        let t = function (actual) {
            assert(actual);
        };

        const tx = function (fn, msg) {
            assertException(fn, msg);
        };

        /**
         * precision  {number} [1, MAX_DIGITS]
         * rounding   {number} [0, 8]
         * toExpNeg   {number} [-EXP_LIMIT, 0]
         * toExpPos   {number} [0, EXP_LIMIT]
         * maxE       {number} [0, EXP_LIMIT]
         * minE       {number} [-EXP_LIMIT, 0]
         * modulo     {number} [0, 9]
         * crypto     {boolean|number} {true, false, 1, 0}
         */

        t(Decimal.config({}) === Decimal);

        tx(() => {
            Decimal.config();

        }, "config()");
        tx(() => {
            Decimal.config(null);
        }, "config(null)");
        tx(() => {
            Decimal.config(undefined);
        }, "config(undefined)");
        tx(() => {
            Decimal.config(0);

        }, "config(0)");
        tx(() => {
            Decimal.config("");

        }, "config('')");
        tx(() => {
            Decimal.config("hi");

        }, "config('hi')");
        tx(() => {
            Decimal.config("123");
        }, "config('123')");

        Decimal.config({
            precision: 20,
            rounding: 4,
            toExpNeg: -7,
            toExpPos: 21,
            minE: -9e15,
            maxE: 9e15,
            crypto: false,
            modulo: 1
        });

        t(Decimal.precision === 20);
        t(Decimal.rounding === 4);
        t(Decimal.toExpNeg === -7);
        t(Decimal.toExpPos === 21);
        t(Decimal.minE === -9e15);
        t(Decimal.maxE === 9e15);
        t(Decimal.crypto === false);
        t(Decimal.modulo === 1);

        Decimal.config({
            precision: 40,
            rounding: 4,
            toExpNeg: -1000,
            toExpPos: 1000,
            minE: -1e9,
            maxE: 1e9,
            //crypto: true,    // requires crypto object
            modulo: 4
        });

        t(Decimal.precision === 40);
        t(Decimal.rounding === 4);
        t(Decimal.toExpNeg === -1000);
        t(Decimal.toExpPos === 1000);
        t(Decimal.minE === -1e9);
        t(Decimal.maxE === 1e9);
        //t(Decimal.crypto === true);    // requires crypto object
        t(Decimal.modulo === 4);

        Decimal.config({
            toExpNeg: -7,
            toExpPos: 21,
            minE: -324,
            maxE: 308
        });

        t(Decimal.toExpNeg === -7);
        t(Decimal.toExpPos === 21);
        t(Decimal.minE === -324);
        t(Decimal.maxE === 308);

        // precision

        t = function (expected, obj) {
            Decimal.config(obj);
            assertEqual(expected, Decimal.precision);
        };

        t(1, { precision: 1 });
        t(1, { precision: void 0 });
        t(20, { precision: 20 });
        t(300000, { precision: 300000 });
        t(4e+8, { precision: 4e8 });
        t(1e9, { precision: 1e9 });
        t(MAX_DIGITS, { precision: MAX_DIGITS });

        tx(() => {
            Decimal.config({ precision: 0 });
        }, "precision: 0");
        tx(() => {
            Decimal.config({ precision: MAX_DIGITS + 1 });

        }, "precision: MAX_DIGITS + 1");
        tx(() => {
            Decimal.config({ precision: MAX_DIGITS + 0.1 });

        }, "precision: MAX_DIGITS + 0.1");
        tx(() => {
            Decimal.config({ precision: "0" });

        }, "precision: '0'");
        tx(() => {
            Decimal.config({ precision: "1" });

        }, "precision: '1'");
        tx(() => {
            Decimal.config({ precision: "123456789" });
        }, "precision: '123456789'");
        tx(() => {
            Decimal.config({ precision: -1 });
        }, "precision: -1");
        tx(() => {
            Decimal.config({ precision: 0.1 });
        }, "precision: 0.1");
        tx(() => {
            Decimal.config({ precision: 1.1 });

        }, "precision: 1.1");
        tx(() => {
            Decimal.config({ precision: -1.1 });

        }, "precision: -1.1");
        tx(() => {
            Decimal.config({ precision: 8.1 });

        }, "precision: 8.1");
        tx(() => {
            Decimal.config({ precision: 1e+9 + 1 });
        }, "precision: 1e9 + 1");
        tx(() => {
            Decimal.config({ precision: [] });

        }, "precision: []");
        tx(() => {
            Decimal.config({ precision: {} });
        }, "precision: {}");
        tx(() => {
            Decimal.config({ precision: "" });

        }, "precision: ''");
        tx(() => {
            Decimal.config({ precision: "hi" });

        }, "precision: 'hi'");
        tx(() => {
            Decimal.config({ precision: "1e+9" });

        }, "precision: '1e+9'");
        tx(() => {
            Decimal.config({ precision: null });

        }, "precision: null");
        tx(() => {
            Decimal.config({ precision: NaN });
        }, "precision: NaN");
        tx(() => {
            Decimal.config({ precision: Infinity });

        }, "precision: Infinity");

        t(MAX_DIGITS, { precision: void 0 });

        // rounding

        t = function (expected, obj) {
            Decimal.config(obj);
            assertEqual(expected, Decimal.rounding);
        };

        t(4, { rounding: void 0 });
        t(0, { rounding: 0 });
        t(1, { rounding: 1 });
        t(2, { rounding: 2 });
        t(3, { rounding: 3 });
        t(4, { rounding: 4 });
        t(5, { rounding: 5 });
        t(6, { rounding: 6 });
        t(7, { rounding: 7 });
        t(8, { rounding: 8 });

        tx(() => {
            Decimal.config({ rounding: -1 });
        }, "rounding : -1");
        tx(() => {
            Decimal.config({ rounding: 0.1 });
        }, "rounding : 0.1");
        tx(() => {
            Decimal.config({ rounding: 8.1 });
        }, "rounding : 8.1");
        tx(() => {
            Decimal.config({ rounding: 9 });
        }, "rounding : 9");
        tx(() => {
            Decimal.config({ rounding: "0" });

        }, "rounding: '0'");
        tx(() => {
            Decimal.config({ rounding: "1" });
        }, "rounding: '1'");
        tx(() => {
            Decimal.config({ rounding: "123456789" });
        }, "rounding: '123456789'");
        tx(() => {
            Decimal.config({ rounding: 1.1 });
        }, "rounding : 1.1");
        tx(() => {
            Decimal.config({ rounding: -1.1 });
        }, "rounding : -1.1");
        tx(() => {
            Decimal.config({ rounding: 11 });
        }, "rounding : 11");
        tx(() => {
            Decimal.config({ rounding: [] });
        }, "rounding : []");
        tx(() => {
            Decimal.config({ rounding: {} });
        }, "rounding : {}");
        tx(() => {
            Decimal.config({ rounding: "" });

        }, "rounding : ''");
        tx(() => {
            Decimal.config({ rounding: "hi" });
        }, "rounding : 'hi'");
        tx(() => {
            Decimal.config({ rounding: null });

        }, "rounding : null");
        tx(() => {
            Decimal.config({ rounding: NaN });

        }, "rounding : NaN");
        tx(() => {
            Decimal.config({ rounding: Infinity });
        }, "rounding : Infinity");

        t(8, { rounding: void 0 });

        // toExpNeg

        t = function (expected, obj) {
            Decimal.config(obj);
            assertEqual(expected, Decimal.toExpNeg);
        };

        t(-7, { toExpNeg: void 0 });
        t(0, { toExpNeg: 0 });
        t(-1, { toExpNeg: -1 });
        t(-999, { toExpNeg: -999 });
        t(-5675367, { toExpNeg: -5675367 });
        t(-98770170790791, { toExpNeg: -98770170790791 });
        t(-EXP_LIMIT, { toExpNeg: -EXP_LIMIT });

        tx(() => {
            Decimal.config({ toExpNeg: -EXP_LIMIT - 1 });
        }, "-EXP_LIMIT - 1");
        tx(() => {
            Decimal.config({ toExpNeg: "-7" });
        }, "toExpNeg: '-7'");
        tx(() => {
            Decimal.config({ toExpNeg: -0.1 });

        }, "toExpNeg: -0.1");
        tx(() => {
            Decimal.config({ toExpNeg: 0.1 });
        }, "toExpNeg: 0.1");
        tx(() => {
            Decimal.config({ toExpNeg: 1 });

        }, "toExpNeg: 1");
        tx(() => {
            Decimal.config({ toExpNeg: -Infinity });
        }, "toExpNeg: -Infinity");
        tx(() => {
            Decimal.config({ toExpNeg: NaN });

        }, "toExpNeg: NaN");
        tx(() => {
            Decimal.config({ toExpNeg: null });
        }, "toExpNeg: null");
        tx(() => {
            Decimal.config({ toExpNeg: {} });

        }, "toExpNeg: {}");

        t(-EXP_LIMIT, { toExpNeg: void 0 });

        // toExpPos

        t = function (expected, obj) {
            Decimal.config(obj);
            assertEqual(expected, Decimal.toExpPos);
        };

        t(21, { toExpPos: void 0 });
        t(0, { toExpPos: 0 });
        t(1, { toExpPos: 1 });
        t(999, { toExpPos: 999 });
        t(5675367, { toExpPos: 5675367 });
        t(98770170790791, { toExpPos: 98770170790791 });
        t(EXP_LIMIT, { toExpPos: EXP_LIMIT });

        tx(() => {
            Decimal.config({ toExpPos: EXP_LIMIT + 1 });
        }, "EXP_LIMIT + 1");
        tx(() => {
            Decimal.config({ toExpPos: "21" });

        }, "toExpPos: '21'");
        tx(() => {
            Decimal.config({ toExpPos: -0.1 });
        }, "toExpPos: -0.1");
        tx(() => {
            Decimal.config({ toExpPos: 0.1 });
        }, "toExpPos: 0.1");
        tx(() => {
            Decimal.config({ toExpPos: -1 });
        }, "toExpPos: -1");
        tx(() => {
            Decimal.config({ toExpPos: Infinity });

        }, "toExpPos: Infinity");
        tx(() => {
            Decimal.config({ toExpPos: NaN });

        }, "toExpPos: NaN");
        tx(() => {
            Decimal.config({ toExpPos: null });
        }, "toExpPos: null");
        tx(() => {
            Decimal.config({ toExpPos: {} });

        }, "toExpPos: {}");

        t(EXP_LIMIT, { toExpPos: void 0 });

        // maxE

        t = function (expected, obj) {
            Decimal.config(obj);
            assertEqual(expected, Decimal.maxE);
        };

        t(308, { maxE: void 0 });
        t(0, { maxE: 0 });
        t(1, { maxE: 1 });
        t(999, { maxE: 999 });
        t(5675367, { maxE: 5675367 });
        t(98770170790791, { maxE: 98770170790791 });
        t(EXP_LIMIT, { maxE: EXP_LIMIT });

        tx(() => {
            Decimal.config({ maxE: EXP_LIMIT + 1 });

        }, "EXP_LIMIT + 1");
        tx(() => {
            Decimal.config({ maxE: "308" });
        }, "maxE: '308'");
        tx(() => {
            Decimal.config({ maxE: -0.1 });

        }, "maxE: -0.1");
        tx(() => {
            Decimal.config({ maxE: 0.1 });

        }, "maxE: 0.1");
        tx(() => {
            Decimal.config({ maxE: -1 });
        }, "maxE: -1");
        tx(() => {
            Decimal.config({ maxE: Infinity });

        }, "maxE: Infinity");
        tx(() => {
            Decimal.config({ maxE: NaN });

        }, "maxE: NaN");
        tx(() => {
            Decimal.config({ maxE: null });
        }, "maxE: null");
        tx(() => {
            Decimal.config({ maxE: {} });

        }, "maxE: {}");

        t(EXP_LIMIT, { maxE: void 0 });

        // minE

        t = function (expected, obj) {
            Decimal.config(obj);
            assertEqual(expected, Decimal.minE);
        };

        t(-324, { minE: void 0 });
        t(0, { minE: 0 });
        t(-1, { minE: -1 });
        t(-999, { minE: -999 });
        t(-5675367, { minE: -5675367 });
        t(-98770170790791, { minE: -98770170790791 });
        t(-EXP_LIMIT, { minE: -EXP_LIMIT });

        tx(() => {
            Decimal.config({ minE: -EXP_LIMIT - 1 });
        }, "-EXP_LIMIT - 1");
        tx(() => {
            Decimal.config({ minE: "-324" });
        }, "minE: '-324'");
        tx(() => {
            Decimal.config({ minE: -0.1 });
        }, "minE: -0.1");
        tx(() => {
            Decimal.config({ minE: 0.1 });

        }, "minE: 0.1");
        tx(() => {
            Decimal.config({ minE: 1 });
        }, "minE: 1");
        tx(() => {
            Decimal.config({ minE: -Infinity });

        }, "minE: -Infinity");
        tx(() => {
            Decimal.config({ minE: NaN });
        }, "minE: NaN");
        tx(() => {
            Decimal.config({ minE: null });
        }, "minE: null");
        tx(() => {
            Decimal.config({ minE: {} });
        }, "minE: {}");

        t(-EXP_LIMIT, { minE: void 0 });

        // crypto

        t = function (expected, obj) {
            Decimal.config(obj);
            assertEqual(expected, Decimal.crypto);
        };

        t(false, { crypto: void 0 });
        t(false, { crypto: 0 });
        //t(true, {crypto: 1});    // requires crypto object
        t(false, { crypto: false });
        //t(true, {crypto: true});    // requires crypto object

        tx(() => {
            Decimal.config({ crypto: "hiya" });

        }, "crypto: 'hiya'");
        tx(() => {
            Decimal.config({ crypto: "true" });
        }, "crypto: 'true'");
        tx(() => {
            Decimal.config({ crypto: "false" });
        }, "crypto: 'false'");
        tx(() => {
            Decimal.config({ crypto: "0" });

        }, "crypto: '0'");
        tx(() => {
            Decimal.config({ crypto: "1" });
        }, "crypto: '1'");
        tx(() => {
            Decimal.config({ crypto: -1 });

        }, "crypto: -1");
        tx(() => {
            Decimal.config({ crypto: 0.1 });
        }, "crypto: 0.1");
        tx(() => {
            Decimal.config({ crypto: 1.1 });
        }, "crypto: 1.1");
        tx(() => {
            Decimal.config({ crypto: [] });
        }, "crypto: []");
        tx(() => {
            Decimal.config({ crypto: {} });
        }, "crypto: {}");
        tx(() => {
            Decimal.config({ crypto: "" });

        }, "crypto: ''");
        tx(() => {
            Decimal.config({ crypto: NaN });

        }, "crypto: NaN");
        tx(() => {
            Decimal.config({ crypto: Infinity });

        }, "crypto: Infinity");

        assertEqual(false, Decimal.crypto);

        // modulo

        t = function (expected, obj) {
            Decimal.config(obj);
            assertEqual(expected, Decimal.modulo);
        };

        t(4, { modulo: void 0 });
        t(0, { modulo: 0 });
        t(1, { modulo: 1 });
        t(2, { modulo: 2 });
        t(3, { modulo: 3 });
        t(4, { modulo: 4 });
        t(5, { modulo: 5 });
        t(6, { modulo: 6 });
        t(7, { modulo: 7 });
        t(8, { modulo: 8 });
        t(9, { modulo: 9 });

        tx(() => {
            Decimal.config({ modulo: -1 });
        }, "modulo: -1");
        tx(() => {
            Decimal.config({ modulo: 0.1 });
        }, "modulo: 0.1");
        tx(() => {
            Decimal.config({ modulo: 9.1 });

        }, "modulo: 9.1");
        tx(() => {
            Decimal.config({ modulo: "0" });

        }, "modulo: '0'");
        tx(() => {
            Decimal.config({ modulo: "1" });
        }, "modulo: '1'");
        tx(() => {
            Decimal.config({ modulo: 1.1 });

        }, "modulo: 1.1");
        tx(() => {
            Decimal.config({ modulo: -1.1 });
        }, "modulo: -1.1");
        tx(() => {
            Decimal.config({ modulo: 10 });
        }, "modulo: 10");
        tx(() => {
            Decimal.config({ modulo: -11 });
        }, "modulo: -11");
        tx(() => {
            Decimal.config({ modulo: [] });
        }, "modulo: []");
        tx(() => {
            Decimal.config({ modulo: {} });
        }, "modulo: {}");
        tx(() => {
            Decimal.config({ modulo: "" });
        }, "modulo: ''");
        tx(() => {
            Decimal.config({ modulo: " " });

        }, "modulo: '  '");
        tx(() => {
            Decimal.config({ modulo: "hi" });

        }, "modulo: 'hi'");
        tx(() => {
            Decimal.config({ modulo: null });
        }, "modulo: null");
        tx(() => {
            Decimal.config({ modulo: NaN });

        }, "modulo: NaN");
        tx(() => {
            Decimal.config({ modulo: Infinity });
        }, "modulo: Infinity");

        t(9, { modulo: void 0 });

        // defaults

        t = function (actual) {
            assert(actual);
        };

        Decimal.config({
            precision: 100,
            rounding: 2,
            toExpNeg: -100,
            toExpPos: 200
        });

        t(Decimal.precision === 100);

        Decimal.config({ defaults: true });

        t(Decimal.precision === 20);
        t(Decimal.rounding === 4);
        t(Decimal.toExpNeg === -7);
        t(Decimal.toExpPos === 21);
        t(is.undefined(Decimal.defaults));

        Decimal.rounding = 3;

        Decimal.config({ precision: 50, defaults: true });

        t(Decimal.precision === 50);
        t(Decimal.rounding === 4);

        // Decimal.set is an alias for Decimal.config
        assertEqual(Decimal.set, Decimal.config);
    });
});
