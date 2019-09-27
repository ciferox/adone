const { lazify } = adone;

const assertion = lazify({
    AssertionError: "./assertion_error",
    config: "./config",
    util: "./__/utils",
    extension: "./extensions",
    getFunctionName: "./get_func_name"
}, adone.asNamespace(exports), require);

const __ = lazify({
    assertion: "./__/assertion",
    core: "./__/core/assertions",
    assert: "./__/interface/assert",
    expect: "./__/interface/expect"
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
