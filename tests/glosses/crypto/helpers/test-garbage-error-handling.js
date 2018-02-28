const {
    is,
    std: { util }
} = adone;

const garbage = [Buffer.from("00010203040506070809", "hex"), {}, null, false, undefined, true, 1, 0, Buffer.from(""), "aGVsbG93b3JsZA==", "helloworld", ""];

const doTests = function (fncName, fnc, num, skipBuffersAndStrings) {
    if (!num) {
        num = 1;
    }

    garbage.forEach((garbage) => {
        if (skipBuffersAndStrings && (is.buffer(garbage) || is.string(garbage))) {
            // skip this garbage because it's a buffer or a string and we were told do do that
            return;
        }
        const args = [];
        for (let i = 0; i < num; i++) {
            args.push(garbage);
        }
        it(`${fncName}(${args.map((garbage) => util.inspect(garbage)).join(", ")})`, () => {
            assert.throws(() => fnc(...args));
        });
    });
};

module.exports = (obj, fncs, num) => {
    describe("returns error via cb instead of crashing", () => {
        fncs.forEach((fnc) => {
            doTests(fnc, obj[fnc], num);
        });
    });
};

module.exports.doTests = doTests;