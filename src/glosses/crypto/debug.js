/**
 * Debugging support for web applications.
 *
 * @author David I. Lehn <dlehn@digitalbazaar.com>
 *
 * Copyright 2008-2013 Digital Bazaar, Inc.
 */

// Private storage for debugging.
// Useful to expose data that is otherwise unviewable behind closures.
// NOTE: remember that this can hold references to data and cause leaks!
// format is "forge._debug.<modulename>.<dataname> = data"
// Example:
// (function() {
//   var cat = 'forge.test.Test'; // debugging category
//   var sState = {...}; // local state
//   set(cat, 'sState', sState);
// })();

const {
    is
} = adone;

export let storage = {};

/**
 * Gets debug data. Omit name for all cat data  Omit name and cat for
 * all data.
 *
 * @param cat name of debugging category.
 * @param name name of data to get (optional).
 * @return object with requested debug data or undefined.
 */
export const get = function (cat, name) {
    let rval;
    if (is.undefined(cat)) {
        rval = storage;
    } else if (cat in storage) {
        if (is.undefined(name)) {
            rval = storage[cat];
        } else {
            rval = storage[cat][name];
        }
    }
    return rval;
};

/**
 * Sets debug data.
 *
 * @param cat name of debugging category.
 * @param name name of data to set.
 * @param data data to set.
 */
export const set = function (cat, name, data) {
    if (!(cat in storage)) {
        storage[cat] = {};
    }
    storage[cat][name] = data;
};

/**
 * Clears debug data. Omit name for all cat data. Omit name and cat for
 * all data.
 *
 * @param cat name of debugging category.
 * @param name name of data to clear or omit to clear entire category.
 */
export const clear = function (cat, name) {
    if (is.undefined(cat)) {
        storage = {};
    } else if (cat in storage) {
        if (is.undefined(name)) {
            delete storage[cat];
        } else {
            delete storage[cat][name];
        }
    }
};
