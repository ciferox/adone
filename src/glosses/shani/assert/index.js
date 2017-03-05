import AssertionError from "./assertion_error";
import * as util from "./lib/utils";
import config from "./lib/config";


const used = new Set();
function use(fn) {
    if (!used.has(fn)) {
        fn(lib, util);
        used.add(fn);
    }

    return lib;
}

const lib = {
    AssertionError,
    util,
    use,
    config
};

import assertion from "./lib/assertion";
use(assertion);

import core from "./lib/core/assertions";
use(core);

import expect from "./lib/interface/expect";
use(expect);

import assert from "./lib/interface/assert";
use(assert);

import mock from "./lib/interface/mock";
use(mock);

export default lib;
