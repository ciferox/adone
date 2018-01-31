const {
    is,
    fake
} = adone;

describe("finance.js", () => {
    describe("account( length )", () => {

        it("should supply a default length if no length is passed", () => {

            const account = fake.finance.account();

            const expected = 8;
            const actual = account.length;

            assert.equal(actual, expected, `The expected default account length is ${expected} but it was ${actual}`);

        });

        it("should supply a length if a length is passed", () => {

            const expected = 9;

            const account = fake.finance.account(expected);

            const actual = account.length;

            assert.equal(actual, expected, `The expected default account length is ${expected} but it was ${actual}`);

        });

        it("should supply a default length if a zero is passed", () => {

            const expected = 8;

            const account = fake.finance.account(0);

            const actual = account.length;

            assert.equal(actual, expected, `The expected default account length is ${expected} but it was ${actual}`);

        });

    });

    describe("accountName()", () => {

        it("should return an account name", () => {

            const actual = fake.finance.accountName();

            assert.ok(actual);

        });

    });

    describe("routingNumber()", () => {

        it("should return a routing number", () => {

            const actual = fake.finance.routingNumber();

            assert.ok(actual);

        });

    });

    describe("mask( length, parens, ellipsis )", () => {
        it("should set a default length", () => {

            const expected = 4; //default account mask length

            const mask = fake.finance.mask(null, false, false);

            const actual = mask.length;

            assert.equal(actual, expected, `The expected default mask length is ${expected} but it was ${actual}`);

        });

        it("should set a specified length", () => {

            let expected = fake.random.number(20);

            expected = (expected == 0 || !expected || is.undefined(expected)) ? 4 : expected;

            const mask = fake.finance.mask(expected, false, false);

            const actual = mask.length; //picks 4 if the random number generator picks 0

            assert.equal(actual, expected, `The expected default mask length is ${expected} but it was ${actual}`);

        });

        it("should set a default length of 4 for a zero value", () => {

            const expected = 4;

            const mask = fake.finance.mask(0, false, false);

            const actual = 4; //picks 4 if the random number generator picks 0

            assert.equal(actual, expected, `The expected default mask length is ${expected} but it was ${actual}`);

        });


        it("should by default include parentheses around a partial account number", () => {

            const expected = true;

            const mask = fake.finance.mask(null, null, false);

            const regexp = new RegExp(/(\(\d{4}?\))/);
            const actual = regexp.test(mask);

            assert.equal(actual, expected, `The expected match for parentheses is ${expected} but it was ${actual}`);

        });

        it("should by default include an ellipsis", () => {

            const expected = true;

            const mask = fake.finance.mask(null, false, null);

            const regexp = new RegExp(/(\.\.\.\d{4})/);
            const actual = regexp.test(mask);

            assert.equal(actual, expected, `The expected match for parentheses is ${expected} but it was ${actual}`);

        });

        it("should work when random variables are passed into the arguments", () => {

            const length = fake.random.number(20);
            const ellipsis = (length % 2 === 0) ? true : false;
            const parens = !ellipsis;

            const mask = fake.finance.mask(length, ellipsis, parens);
            assert.ok(mask);

        });


    });

    describe("amount(min, max, dec, symbol)", () => {

        it("should use the default amounts when not passing arguments", () => {
            const amount = fake.finance.amount();

            assert.ok(amount);
            assert.equal((amount > 0), true, "the amount should be greater than 0");
            assert.equal((amount < 1001), true, "the amount should be greater than 0");

        });

        it("should use the defaul decimal location when not passing arguments", () => {

            const amount = fake.finance.amount();

            const decimal = ".";
            const expected = amount.length - 3;
            const actual = amount.indexOf(decimal);

            assert.equal(actual, expected, `The expected location of the decimal is ${expected} but it was ${actual} amount ${amount}`);
        });

        //TODO: add support for more currency and decimal options
        it("should not include a currency symbol by default", () => {

            const amount = fake.finance.amount();

            const regexp = new RegExp(/[0-9.]/);

            const expected = true;
            const actual = regexp.test(amount);

            assert.equal(actual, expected, "The expected match should not include a currency symbol");
        });


        it("it should handle negative amounts", () => {

            const amount = fake.finance.amount(-200, -1);

            assert.ok(amount);
            assert.equal((amount < 0), true, "the amount should be greater than 0");
            assert.equal((amount > -201), true, "the amount should be greater than 0");
        });


        it("it should handle argument dec", () => {

            const amount = fake.finance.amount(100, 100, 1);

            assert.ok(amount);
            assert.strictEqual(amount, "100.0", "the amount should be equal 100.0");
        });

        it("it should handle argument dec = 0", () => {

            const amount = fake.finance.amount(100, 100, 0);

            assert.ok(amount);
            assert.strictEqual(amount, "100", "the amount should be equal 100");
        });

    });

    describe("transactionType()", () => {

        it("should return a random transaction type", () => {
            const transactionType = fake.finance.transactionType();

            assert.ok(transactionType);
        });
    });

    describe("currencyCode()", () => {
        it("returns a random currency code with a format", () => {
            const currencyCode = fake.finance.currencyCode();

            assert.ok(currencyCode.match(/[A-Z]{3}/));
        });
    });

    describe("bitcoinAddress()", () => {
        it("returns a random bitcoin address", () => {
            const bitcoinAddress = fake.finance.bitcoinAddress();

            assert.ok(bitcoinAddress.match(/^[A-Z0-9.]{27,34}$/));
        });
    });

    describe("ethereumAddress()", () => {
        it("returns a random ethereum address", () => {
            const ethereumAddress = fake.finance.ethereumAddress();
            assert.ok(ethereumAddress.match(/^(0x)[0-9a-f]{40}$/i));
        });
    });

    describe("creditCardNumber()", () => {
        const luhnFormula = require("./support/luhnCheck.js");

        it("returns a random credit card number", () => {
            let number = fake.finance.creditCardNumber();
            number = number.replace(/\D/g, ""); // remove formating
            console.log("version:", process.version, number, number.length);
            assert.ok(number.length >= 13 && number.length <= 20);
            assert.ok(number.match(/^[0-9]{13,20}$/));
            assert.ok(luhnFormula(number));
        });

        it("returns a valid credit card number", () => {
            assert.ok(luhnFormula(fake.finance.creditCardNumber("")));
            assert.ok(luhnFormula(fake.finance.creditCardNumber()));
            assert.ok(luhnFormula(fake.finance.creditCardNumber()));
            assert.ok(luhnFormula(fake.finance.creditCardNumber("visa")));
            assert.ok(luhnFormula(fake.finance.creditCardNumber("mastercard")));
            assert.ok(luhnFormula(fake.finance.creditCardNumber("discover")));
            assert.ok(luhnFormula(fake.finance.creditCardNumber()));
            assert.ok(luhnFormula(fake.finance.creditCardNumber()));
        });
        it("returns a correct credit card number when issuer provided", () => {
        //TODO: implement checks for each format with regexp
            const visa = fake.finance.creditCardNumber("visa");
            assert.ok(visa.match(/^4(([0-9]){12}|([0-9]){3}(\-([0-9]){4}){3})$/));
            assert.ok(luhnFormula(visa));


            const mastercard = fake.finance.creditCardNumber("mastercard");
            assert.ok(mastercard.match(/^(5[1-5]\d{2}|6771)(\-\d{4}){3}$/));
            assert.ok(luhnFormula(mastercard));

            const discover = fake.finance.creditCardNumber("discover");

            assert.ok(luhnFormula(discover));

            const american_express = fake.finance.creditCardNumber("american_express");
            assert.ok(luhnFormula(american_express));
            const diners_club = fake.finance.creditCardNumber("diners_club");
            assert.ok(luhnFormula(diners_club));
            const jcb = fake.finance.creditCardNumber("jcb");
            assert.ok(luhnFormula(jcb));
            const switchC = fake.finance.creditCardNumber("mastercard");
            assert.ok(luhnFormula(switchC));
            const solo = fake.finance.creditCardNumber("solo");
            assert.ok(luhnFormula(solo));
            const maestro = fake.finance.creditCardNumber("maestro");
            assert.ok(luhnFormula(maestro));
            const laser = fake.finance.creditCardNumber("laser");
            assert.ok(luhnFormula(laser));
            const instapayment = fake.finance.creditCardNumber("instapayment");
            assert.ok(luhnFormula(instapayment));
        });
        it("returns custom formated strings", () => {
            let number = fake.finance.creditCardNumber("###-###-##L");
            assert.ok(number.match(/^\d{3}\-\d{3}\-\d{3}$/));
            assert.ok(luhnFormula(number));
            number = fake.finance.creditCardNumber("234[5-9]#{999}L");
            assert.ok(number.match(/^234[5-9]\d{1000}$/));
            assert.ok(luhnFormula(number));
        });
    });
    
    describe("creditCardCVV()", () => {
        it("returns a random credit card CVV", () => {
            const cvv = fake.finance.creditCardCVV();
            assert.ok(cvv.length === 3);
            assert.ok(cvv.match(/^[0-9]{3}$/));
        });
    });
      

    describe("iban()", () => {
        it("returns a random yet formally correct IBAN number", () => {
            const iban = fake.finance.iban();
            const bban = iban.substring(4) + iban.substring(0, 4);

            assert.equal(adone.fake.iban.mod97(adone.fake.iban.toDigitString(bban)), 1, "the result should be equal to 1");
        });
    });

    describe("bic()", () => {
        it("returns a random yet formally correct BIC number", () => {
            const bic = fake.finance.bic();
            const expr = new RegExp(`^[A-Z]{4}(${adone.fake.iban.iso3166.join("|")})[A-Z2-9][A-NP-Z0-9]([A-Z0-9]{3})?$`, "i");

            assert.ok(bic.match(expr));
        });
    });
});
