/* global it describe assert */

import restore from "adone/glosses/shani/mock/util/restore";
import createStub from "adone/glosses/shani/mock/stub";

describe("util/restore", function () {
    it("restores all methods of supplied object", function () {
        const methodA = function () {};
        const methodB = function () {};
        const nonEnumerableMethod = function () {};
        const obj = { methodA: methodA, methodB: methodB, nonEnumerableMethod: nonEnumerableMethod };
        Object.defineProperty(obj, "nonEnumerableMethod", {
            enumerable: false
        });

        createStub(obj);
        restore(obj);

        assert.deepEqual(obj.methodA, methodA);
        assert.deepEqual(obj.methodB, methodB);
        assert.deepEqual(obj.nonEnumerableMethod, nonEnumerableMethod);
    });

    it("only restores restorable methods", function () {
        const stubbedMethod = function () {};
        const vanillaMethod = function () {};
        const obj = { stubbedMethod: stubbedMethod, vanillaMethod: vanillaMethod };

        createStub(obj, "stubbedMethod");
        restore(obj);

        assert.deepEqual(obj.stubbedMethod, stubbedMethod);
    });

    it("restores a single stubbed method", function () {
        const method = function () {};
        const obj = { method: method };

        createStub(obj);
        restore(obj.method);

        assert.deepEqual(obj.method, method);
    });
});
