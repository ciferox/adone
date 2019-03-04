const { lazify } = adone;

const assertion = lazify({
    AssertionError: "./assertion_error",
    config: "./config",
    util: "./__/utils"
}, adone.asNamespace(exports), require);

const __ = lazify({
    assertion: "./__/assertion",
    core: "./__/core/assertions",
    assert: "./__/interface/assert",
    expect: "./__/interface/expect"
}, null, require);

export const extension = lazify({
    dirty: "./extensions/dirty",
    mock: "./extensions/mock",
    promise: "./extensions/promise",
    checkmark: "./extensions/checkmark",
    spy: "./extensions/spy",
    string: "./extensions/string"
}, null, require);

const used = new Set();

export const use = (fn) => {
    if (!used.has(fn)) {
        fn(assertion, assertion.util);
        used.add(fn);
    }
    return assertion;
};

assertion
    .use(__.assertion)
    .use(__.core)
    .use(__.expect)
    .use(__.assert);
