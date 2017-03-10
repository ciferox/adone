
const { util, net: { http: { x } } } = adone;

// use shani.util.assert ?

const assert = (value, status, msg, opts) => {
    if (value) {
        return; 
    }
    throw x.create(status, msg, opts);
};

assert.equal = (a, b, status, msg, opts) => {
    assert(a == b, status, msg, opts);  // eslint-disable-line eqeqeq
};

assert.notEqual = (a, b, status, msg, opts) => {
    assert(a != b, status, msg, opts);  // eslint-disable-line eqeqeq
};

assert.strictEqual = (a, b, status, msg, opts) => {
    assert(a === b, status, msg, opts);
};

assert.notStrictEqual = (a, b, status, msg, opts) => {
    assert(a !== b, status, msg, opts);
};

assert.deepEqual = (a, b, status, msg, opts) => {
    assert(util.deepEqual(a, b), status, msg, opts);
};

assert.notDeepEqual = (a, b, status, msg, opts) => {
    assert(!util.deepEqual(a, b), status, msg, opts);
};

export default assert;
