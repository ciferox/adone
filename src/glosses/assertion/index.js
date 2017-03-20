const { lazify } = adone;

const lazy = lazify({
    assertion: "./lib/assertion",
    core: "./lib/core/assertions",
    assertInterface: "./lib/interface/assert",
    expectInterface: "./lib/interface/expect",
    mockInterface: "./lib/interface/mock"
}, null, require);

const assertion = lazify({
    util: "./lib/utils",
    config: "./lib/config",
    AssertionError: "./assertion_error"
}, exports, require);

export const used = new Set();

export const use = (fn) => {
    if (!used.has(fn)) {
        fn(assertion, assertion.util);
        used.add(fn);
    }
    return assertion;
};

export const loadMockInterface = () => {
    return assertion
        .use(lazy.assertion)
        .use(lazy.core)
        .use(lazy.mockInterface);
};

export const loadAssertInterface = () => {
    return assertion
        .use(lazy.assertion)
        .use(lazy.core)
        .use(lazy.assertInterface);
};

export const loadExpectInterface = () => {
    return assertion
        .use(lazy.assertion)
        .use(lazy.core)
        .use(lazy.expectInterface);
};
