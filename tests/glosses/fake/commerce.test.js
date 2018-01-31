const {
    fake
} = adone;

describe("commerce.js", () => {

    describe("color()", () => {
        it("returns random value from commerce.color array", () => {
            const color = fake.commerce.color();
            assert.ok(fake.definitions.commerce.color.indexOf(color) !== -1);
        });
    });

    describe("department(max, fixedValue)", () => {

        it("should use the default amounts when not passin arguments", () => {
            const department = fake.commerce.department();
            assert.ok(department.split(" ").length === 1);
        });

    /*

    it("should return only one value if we specify a maximum of one", function() {
        spy(fake.random, 'arrayElement');

        var department = fake.commerce.department(1);

        assert.strictEqual(department.split(" ").length, 1);
        assert.ok(fake.random.arrayElement.calledOnce);

        fake.random.arrayElement.restore();
    });

    it("should return the maxiumum value if we specify the fixed value", function() {
        spy(fake.random, 'arrayElement');

        var department = fake.commerce.department(5, true);

        console.log(department);

        // account for the separator
        assert.strictEqual(department.split(" ").length, 6);
        // Sometimes it will generate duplicates that aren't used in the final string,
        // so we check if arrayElement has been called exactly or more than 5 times
        assert.ok(fake.random.arrayElement.callCount >= 5);

        fake.random.arrayElement.restore();
    });
    */
    });

    describe("productName()", () => {
        it("returns name comprising of an adjective, material and product", () => {
            spy(fake.random, "arrayElement");
            spy(fake.commerce, "productAdjective");
            spy(fake.commerce, "productMaterial");
            spy(fake.commerce, "product");
            const name = fake.commerce.productName();

            assert.ok(name.split(" ").length >= 3);
            assert.ok(fake.random.arrayElement.calledThrice);
            assert.ok(fake.commerce.productAdjective.calledOnce);
            assert.ok(fake.commerce.productMaterial.calledOnce);
            assert.ok(fake.commerce.product.calledOnce);

            fake.random.arrayElement.restore();
            fake.commerce.productAdjective.restore();
            fake.commerce.productMaterial.restore();
            fake.commerce.product.restore();
        });
    });

    describe("price(min, max, dec, symbol)", () => {
        it("should use the default amounts when not passing arguments", () => {
            const price = fake.commerce.price();

            assert.ok(price);
            assert.equal((price > 0), true, "the amount should be greater than 0");
            assert.equal((price < 1001), true, "the amount should be less than 1000");
        });

        it("should use the default decimal location when not passing arguments", () => {
            const price = fake.commerce.price();

            const decimal = ".";
            const expected = price.length - 3;
            const actual = price.indexOf(decimal);

            assert.equal(actual, expected, `The expected location of the decimal is ${expected} but it was ${actual} amount ${price}`);
        });

        it("should not include a currency symbol by default", () => {

            const amount = fake.commerce.price();

            const regexp = new RegExp(/[0-9.]/);

            const expected = true;
            const actual = regexp.test(amount);

            assert.equal(actual, expected, "The expected match should not include a currency symbol");
        });

        it("it should handle negative amounts, but return 0", () => {

            const amount = fake.commerce.price(-200, -1);

            assert.ok(amount);
            assert.equal((amount == 0.00), true, "the amount should equal 0");
        });

        it("it should handle argument dec", () => {

            const price = fake.commerce.price(100, 100, 1);

            assert.ok(price);
            assert.strictEqual(price, "100.0", "the price should be equal 100.0");
        });

        it("it should handle argument dec = 0", () => {

            const price = fake.commerce.price(100, 100, 0);

            assert.ok(price);
            assert.strictEqual(price, "100", "the price should be equal 100");
        });

    });

});
