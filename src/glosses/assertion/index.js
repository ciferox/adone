const { lazify } = adone;

const assertion = lazify({
    AssertionError: "./assertion_error",
    config: "./config"
}, exports, require);

export const __ = lazify({
    util: "./__/utils",
    assertion: "./__/assertion",
    core: "./__/core/assertions",
    assertInterface: "./__/interface/assert",
    expectInterface: "./__/interface/expect",
    mockInterface: "./__/interface/mock"
}, null, require);

export const used = new Set();

export const use = (fn) => {
    if (!used.has(fn)) {
        fn(assertion, __.util);
        used.add(fn);
    }
    return assertion;
};

export const loadMockInterface = () => {
    return assertion
        .use(__.assertion)
        .use(__.core)
        .use(__.mockInterface);
};

export const loadAssertInterface = () => {
    return assertion
        .use(__.assertion)
        .use(__.core)
        .use(__.assertInterface);
};

export const loadExpectInterface = () => {
    return assertion
        .use(__.assertion)
        .use(__.core)
        .use(__.expectInterface);
};

export const __esNamespace = true;
