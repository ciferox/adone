import * as $mock from "adone/glosses/shani/mock";


describe("issues", function () {
    describe("#852 - createStubInstance on intherited constructors", function () {
        it("must not throw error", function () {
            const A = function () {};
            const B = function () {};

            B.prototype = Object.create(A.prototype);
            B.prototype.constructor = A;

            $mock.createStubInstance(B);
        });
    });

    describe("#852(2) - createStubInstance should on same constructor", function () {
        it("must be idempotent", function () {
            const A = function () {};
            $mock.createStubInstance(A);
            $mock.createStubInstance(A);
        });
    });

    describe("#1026", function () {
        it("should stub `watch` method on any Object", function () {
            // makes sure that Object.prototype.watch is set back to its old value
            function restore(oldWatch) {
                if (oldWatch) {
                    Object.prototype.watch = oldWatch;  // eslint-disable-line no-extend-native
                } else {
                    delete Object.prototype.watch;
                }
            }

            let oldWatch;
            try {
                oldWatch = Object.prototype.watch;

                if (typeof Object.prototype.watch !== "function") {
                    Object.prototype.watch = function rolex() {}; // eslint-disable-line no-extend-native
                }

                const stubbedObject = $mock.stub({
                    watch() {}
                });

                stubbedObject.watch();

                assert.isArray(stubbedObject.watch.args);
            } catch (error) {
                restore(oldWatch);
                throw error;
            }

            restore(oldWatch);
        });
    });
});
