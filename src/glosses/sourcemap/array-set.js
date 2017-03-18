/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
// @flow
import * as util from "./util";

/**
 * A data structure which is a combination of an array and a set. Adding a new
 * member is O(1), testing for membership is O(1), and finding the index of an
 * element is O(1). Removing elements from the set is not supported. Only
 * strings are supported for membership.
 */
export default class ArraySet {
    _array: Array<string>;
    _map: Map<string, number>;

    constructor() {
        this._array = [];
        this._map = new Map();
    }


    /**
     * Static method for creating ArraySet instances from an existing array.
     */
    static fromArray(other: Array<string>, allowDuplicates?: boolean): ArraySet {
        const set = new ArraySet();
        for (let i = 0, n = other.length; i < n; ++i) {
            set.add(other[i], allowDuplicates);
        }
        return set;
    }

    /**
     * Return how many unique items are in this ArraySet. If duplicates have been
     * added, than those do not count towards the size.
     */
    size(): number {
        return this._map.size;
    }

    /**
     * Add the given string to this set.
     */
    add(value: string, aAllowDuplicates?: boolean = false) {
        const s = util.toSetString(value);
        const isDuplicate = this._map.has(s);
        const idx = this._array.length;
        if (!isDuplicate || aAllowDuplicates) {
            this._array.push(value);
        }
        if (!isDuplicate) {
            this._map.set(s, idx);
        }
    }

    /**
     * Is the given string a member of this set?
     */
    has(value: string): boolean {
        const s = util.toSetString(value);
        return this._map.has(s);
    }

    /**
     * What is the index of the given string in the array?
     */
    indexOf(value: string): number {
        const s = util.toSetString(value);
        if (!this._map.has(s)) {
            throw new Error(`"${value} is not in the set.`);
        }
        // $FlowIgnore: it will always be a number
        return this._map.get(s);
    }

    /**
     * What is the element at the given index?
     */
    at(idx: number): string {
        if (idx >= 0 && idx < this._array.length) {
            return this._array[idx];
        }
        throw new Error(`No element indexed by ${idx}`);
    }

    /**
     * Returns the array representation of this set (which has the proper indices
     * indicated by indexOf). Note that this is a copy of the internal array used
     * for storing the members so that no one can mess with internal state.
     */
    toArray(): Array<string> {
        return this._array.slice();
    }
}