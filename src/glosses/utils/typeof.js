// @flow



const setIteratorPrototype = Object.getPrototypeOf(new Set().entries());
const mapIteratorPrototype = Object.getPrototypeOf(new Map().entries());
const arrayIteratorPrototype = Object.getPrototypeOf([][Symbol.iterator]());
const stringIteratorPrototype = Object.getPrototypeOf(""[Symbol.iterator]());

export default function typeOf(obj) {
    /* ! Speed optimisation
     * Pre:
     *   string literal     x 3,039,035 ops/sec ±1.62% (78 runs sampled)
     *   boolean literal    x 1,424,138 ops/sec ±4.54% (75 runs sampled)
     *   number literal     x 1,653,153 ops/sec ±1.91% (82 runs sampled)
     *   undefined          x 9,978,660 ops/sec ±1.92% (75 runs sampled)
     *   function           x 2,556,769 ops/sec ±1.73% (77 runs sampled)
     * Post:
     *   string literal     x 38,564,796 ops/sec ±1.15% (79 runs sampled)
     *   boolean literal    x 31,148,940 ops/sec ±1.10% (79 runs sampled)
     *   number literal     x 32,679,330 ops/sec ±1.90% (78 runs sampled)
     *   undefined          x 32,363,368 ops/sec ±1.07% (82 runs sampled)
     *   function           x 31,296,870 ops/sec ±0.96% (83 runs sampled)
     */
    const typeofObj = typeof obj;
    if (typeofObj !== "object") {
        return typeofObj;
    }

    /* ! Speed optimisation
     * Pre:
     *   null               x 28,645,765 ops/sec ±1.17% (82 runs sampled)
     * Post:
     *   null               x 36,428,962 ops/sec ±1.37% (84 runs sampled)
     */
    if (obj === null) {
        return "null";
    }

    if (obj === global) {
        return "global";
    }

    /* ! Speed optimisation
     * Pre:
     *   array literal      x 2,888,352 ops/sec ±0.67% (82 runs sampled)
     * Post:
     *   array literal      x 22,479,650 ops/sec ±0.96% (81 runs sampled)
     */
    if (adone.is.array(obj)) {
        return "Array";
    }

    const stringTag = obj[Symbol.toStringTag];
    if (adone.is.string(stringTag)) {
        return stringTag;
    }

    const objPrototype = Object.getPrototypeOf(obj);
    /* ! Speed optimisation
    * Pre:
    *   regex literal      x 1,772,385 ops/sec ±1.85% (77 runs sampled)
    *   regex constructor  x 2,143,634 ops/sec ±2.46% (78 runs sampled)
    * Post:
    *   regex literal      x 3,928,009 ops/sec ±0.65% (78 runs sampled)
    *   regex constructor  x 3,931,108 ops/sec ±0.58% (84 runs sampled)
    */
    if (objPrototype === RegExp.prototype) {
        return "RegExp";
    }

    /* ! Speed optimisation
    * Pre:
    *   date               x 2,130,074 ops/sec ±4.42% (68 runs sampled)
    * Post:
    *   date               x 3,953,779 ops/sec ±1.35% (77 runs sampled)
    */
    if (objPrototype === Date.prototype) {
        return "Date";
    }

    if (objPrototype === Promise.prototype) {
        return "Promise";
    }

    if (objPrototype === Set.prototype) {
        return "Set";
    }

    if (objPrototype === Map.prototype) {
        return "Map";
    }

    if (objPrototype === WeakSet.prototype) {
        return "WeakSet";
    }

    if (objPrototype === DataView.prototype) {
        return "DataView";
    }

    if (objPrototype === mapIteratorPrototype) {
        return "Map Iterator";
    }

    if (objPrototype === setIteratorPrototype) {
        return "Set Iterator";
    }

    if (objPrototype === arrayIteratorPrototype) {
        return "Array Iterator";
    }

    /* ! Spec Conformance
     * (http://www.ecma-international.org/ecma-262/6.0/index.html#sec-%stringiteratorprototype%-@@tostringtag)
     * ES6$21.1.5.2.2 - %StringIteratorPrototype%[@@toStringTag] should be "String Iterator":
     * Test: `Object.prototype.toString.call(''[Symbol.iterator]())``
     *  - Edge <=13 === "[object Object]"
     */
    if (objPrototype === stringIteratorPrototype) {
        return "String Iterator";
    }

    if (objPrototype === null) {
        return "Object";
    }

    return Object.prototype.toString.call(obj).slice(8, -1);
}