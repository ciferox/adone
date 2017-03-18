/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

import * as binarySearch from "adone/glosses/sourcemap/binary-search";

function numberCompare(a, b) {
    return a - b;
}

describe("Compiler", () => {
    describe("Souce Map", () => {
        describe("binary-search", () => {

            it("test too high with default (glb) bias", () => {
                var needle = 30;
                var haystack = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

                assert.doesNotThrow(function () {
                    binarySearch.search(needle, haystack, numberCompare);
                });

                assert.equal(haystack[binarySearch.search(needle, haystack, numberCompare)], 20);
            });

            it("test too low with default (glb) bias", () => {
                var needle = 1;
                var haystack = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

                assert.doesNotThrow(function () {
                    binarySearch.search(needle, haystack, numberCompare);
                });

                assert.equal(binarySearch.search(needle, haystack, numberCompare), -1);
            });

            it("test too high with lub bias", () => {
                var needle = 30;
                var haystack = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

                assert.doesNotThrow(function () {
                    binarySearch.search(needle, haystack, numberCompare);
                });

                assert.equal(binarySearch.search(needle, haystack, numberCompare,
                                            binarySearch.LEAST_UPPER_BOUND), -1);
            });

            it("test too low with lub bias", () => {
                var needle = 1;
                var haystack = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

                assert.doesNotThrow(function () {
                    binarySearch.search(needle, haystack, numberCompare);
                });

                assert.equal(haystack[binarySearch.search(needle, haystack, numberCompare,
                                                        binarySearch.LEAST_UPPER_BOUND)], 2);
            });

            it("test exact search", () => {
                var needle = 4;
                var haystack = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

                assert.equal(haystack[binarySearch.search(needle, haystack, numberCompare)], 4);
            });

            it("test fuzzy search with default (glb) bias", () => {
                var needle = 19;
                var haystack = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

                assert.equal(haystack[binarySearch.search(needle, haystack, numberCompare)], 18);
            });

            it("test fuzzy search with lub bias", () => {
                var needle = 19;
                var haystack = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

                assert.equal(haystack[binarySearch.search(needle, haystack, numberCompare,
                                                        binarySearch.LEAST_UPPER_BOUND)], 20);
            });

            it("test multiple matches", () => {
                var needle = 5;
                var haystack = [1, 1, 2, 5, 5, 5, 13, 21];

                assert.equal(binarySearch.search(needle, haystack, numberCompare,
                                            binarySearch.LEAST_UPPER_BOUND), 3);
            });

            it("test multiple matches at the beginning", () => {
                var needle = 1;
                var haystack = [1, 1, 2, 5, 5, 5, 13, 21];

                assert.equal(binarySearch.search(needle, haystack, numberCompare,
                                            binarySearch.LEAST_UPPER_BOUND), 0);
            });
        });
    });
});
