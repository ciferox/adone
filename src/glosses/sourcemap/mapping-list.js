/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2014 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

// @flow
import * as util from "./util";

export type Mapping = {
    generatedLine: number;
    generatedColumn: number;
    originalLine: number;
    originalColumn: number;
};

/**
 * Determine whether mappingB is after mappingA with respect to generated
 * position.
 */
function generatedPositionAfter(mappingA: Mapping, mappingB: Mapping) {
    // Optimized for most common case
    const lineA = mappingA.generatedLine;
    const lineB = mappingB.generatedLine;
    const columnA = mappingA.generatedColumn;
    const columnB = mappingB.generatedColumn;
    return lineB > lineA || lineB == lineA && columnB >= columnA || util.compareByGeneratedPositionsInflated(mappingA, mappingB) <= 0;
}

/**
 * A data structure to provide a sorted view of accumulated mappings in a
 * performance conscious manner. It trades a neglibable overhead in general
 * case for a large speedup in case of mappings being added in order.
 */
export default class MappingList {
    _array: Array<Mapping>;
    _sorted: boolean;
    _last: Mapping;

    constructor() {
        this._array = [];
        this._sorted = true;
        // Serves as infimum
        this._last = { generatedLine: -1, generatedColumn: 0 };
    }

    /**
     * Iterate through internal items. This method takes the same arguments that
     * `Array.prototype.forEach` takes.
     *
     * NOTE: The order of the mappings is NOT guaranteed.
     */
    unsortedForEach(callback: Function, thisValue: any): void {
        this._array.forEach(callback, thisValue);
    }

    /**
     * Add the given source mapping.
     *
     * @param Object aMapping
     */
    add(mapping: Mapping): void {
        if (generatedPositionAfter(this._last, mapping)) {
            this._last = mapping;
        } else {
            this._sorted = false;
        }
        this._array.push(mapping);
    }

    /**
     * Returns the flat, sorted array of mappings. The mappings are sorted by
     * generated position.
     *
     * WARNING: This method returns internal data without copying, for
     * performance. The return value must NOT be mutated, and should be treated as
     * an immutable borrow. If you want to take ownership, you must make your own
     * copy.
     */
    toArray(): Array<Mapping> {
        if (!this._sorted) {
            this._array.sort(util.compareByGeneratedPositionsInflated);
            this._sorted = true;
        }
        return this._array;
    }
}