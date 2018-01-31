const {
    fake
} = adone;

// TODO: make some tests for getting / setting locales

// Remark: actual use of locales functionality is currently tested in all.functional.js test

describe("locale", () => {
    describe("setLocale()", () => {
        it("setLocale() changes fake.locale", () => {
            for (const locale in fake.locales) {
                fake.setLocale(locale);
                assert.equal(fake.getLocale(), locale);
            }
        });
    });
});
