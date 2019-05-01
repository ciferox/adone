const {
    is
} = adone;

module.exports = function (assert) {
    const utils = {};
    utils.expect = (expected, msg) => (actual) => assert.deepEqual(actual, expected, msg);
    utils.nextTick = (fn) => {
        return new Promise((resolve, reject) => {
            process.nextTick(() => fn().then(resolve).catch(reject));
        });
    };

    utils.immediate = (fn) => {
        return new Promise((resolve, reject) => {
            setImmediate(() => fn().then(resolve).catch(reject));
        });
    };

    utils.timeout = (fn, ms = 0) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => fn().then(resolve).catch(reject), ms);
        });
    };

    utils.keypresses = async (prompt, chars) => {
        for (const ch of chars) {
            await utils.timeout(() => prompt.keypress(ch));
        }
    };

    assert.has = function (a, b, msg) {
        if (is.array(a)) {
            assert(is.array(b), "expected an array");
            for (let i = 0; i < b.length; i++) {
                assert.has(a[i], b[i], msg); 
            }
            return;
        }

        if (is.string(a)) {
            assert.equal(typeof b, "string", "expected a string");
            assert(a.includes(b), msg);
            return;
        }

        for (const key of Object.keys(b)) {
            assert.deepEqual(a[key], b[key], msg);
        }
    };

    return utils;
};
