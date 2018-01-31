const {
    fake
} = adone;

describe("phone_number.js", () => {
    describe("phoneNumber()", () => {
        it("returns a random phoneNumber with a random format", () => {
            spy(fake.helpers, "replaceSymbolWithNumber");
            const phone_number = fake.phone.phoneNumber();

            assert.ok(phone_number.match(/\d/));
            assert.ok(fake.helpers.replaceSymbolWithNumber.called);

            fake.helpers.replaceSymbolWithNumber.restore();
        });
    });

    describe("phoneNumberFormat()", () => {
        it("returns phone number with requested format (Array index)", () => {
            fake.setLocale("en");
            for (let i = 0; i < 10; i++) {
                const phone_number = fake.phone.phoneNumberFormat(1);
                assert.ok(phone_number.match(/\(\d\d\d\) \d\d\d-\d\d\d\d/));
            }
        });

        it("returns phone number with proper format US (Array index)", () => {
            fake.setLocale("en");
            for (let i = 0; i < 25; i++) {
                const phone_number = fake.phone.phoneNumberFormat(1);
                console.log(phone_number);
                assert.ok(phone_number.match(/\([2-9]\d\d\) [2-9]\d\d-\d\d\d\d/));
            }
        });

        it("returns phone number with proper format CA (Array index)", () => {
            fake.setLocale("en_CA");
            for (let i = 0; i < 25; i++) {
                const phone_number = fake.phone.phoneNumberFormat(1);
                assert.ok(phone_number.match(/\([2-9]\d\d\)[2-9]\d\d-\d\d\d\d/));
            }
        });

    });

});
