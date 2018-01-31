const {
    is,
    fake
} = adone;

const IGNORED_MODULES = ["locales", "locale", "localeFallback", "definitions", "fake", "helpers"];
const IGNORED_METHODS = {
    system: ["directoryPath", "filePath"] // these are TODOs
};

const isTestableModule = (mod) => IGNORED_MODULES.indexOf(mod) === -1;

const isMethodOf = (mod) => function (meth) {
    return is.function(fake[mod][meth]);
};


const isTestableMethod = (mod) => function (meth) {
    return !(mod in IGNORED_METHODS && IGNORED_METHODS[mod].indexOf(meth) >= 0);
};


const both = (pred1, pred2) => function (value) {
    return pred1(value) && pred2(value);
};


// Basic smoke tests to make sure each method is at least implemented and returns a value.

const modules = Object.keys(fake).filter(isTestableModule).reduce((result, mod) => {
    result[mod] = Object.keys(fake[mod]).filter(both(isMethodOf(mod), isTestableMethod(mod)));
    return result;
}, {});

describe.skip("functional tests", () => {
    for (const locale in fake.locales) {
        fake.setLocale(locale);
        Object.keys(modules).forEach((module) => {
            describe(module, () => {
                modules[module].forEach((meth) => {
                    it(`${meth}()`, () => {
                        const result = fake[module][meth]();
                        if (meth === "boolean") {
                            assert.ok(result === true || result === false);
                        } else {
                            assert.ok(result);
                        }
                    });
                });
            });
        });
    }
});
