/* eslint-disable adone/no-undefined-comp */

export default function (lib, util) {
    const DEFERRED = "__deferred__";

    const { Assertion } = lib;
    const { flag } = util;

    // Defer some chain operation
    // eslint-disable-next-line func-style
    function defer(ctx, deferFunc) {
        // See if we have any deferred asserts
        const deferred = flag(ctx, DEFERRED) || [];

        deferred.push(deferFunc);

        flag(ctx, DEFERRED, deferred);
    }

    // Grab and assert on any deferred operations
    // eslint-disable-next-line func-style
    function execDeferred(ctx) {
        const deferreds = flag(ctx, DEFERRED) || [];
        let root = ctx;
        let deferred;

        // Clear the deferred asserts
        flag(ctx, DEFERRED, undefined);

        while ((deferred = deferreds.shift())) {
            const result = deferred.call(root);
            if (result !== undefined) {
                root = result;
            }
        }

        return root;
    }

    // eslint-disable-next-line func-style
    function applyMessageToLastDeferred(ctx, msg) {
        const deferreds = flag(ctx, DEFERRED);
        if (deferreds && deferreds.length > 0) {
            deferreds.splice(-1, 0, function () {
                flag(this, "message", msg);
            });
        }
    }

    // eslint-disable-next-line func-style
    function convertAssertionPropertyToChainMethod(name, getter) {
        if (getter) {
            Assertion.addChainableMethod(name,
                function newMethod(msg) {
                    if (msg) {
                        applyMessageToLastDeferred(this, msg);
                    }

                    // Execute any deferred asserts when the method is executed
                    return execDeferred(this);
                },
                function newProperty() {
                    // Flag deferred assert here
                    defer(this, getter);
                    return this;
                });
        }
    }

    /**
     * Checks to see if a getter calls the `this.assert` function
     *
     * This is not super-reliable since we don't know the required
     * preconditions for the getter. A best option would be for chai
     * to differentiate between asserting properties and ones that only chain.
     */
    // eslint-disable-next-line func-style
    function callsAssert(getter) {
        const stub = {
            assertCalled: false,
            assert() {
                this.assertCalled = true;
            }
        };

        try {
            getter.call(stub);
        } catch (e) {
            // This most likely happened because we don't meet the getter's preconditions
            // Error on the side of conversion
            stub.assertCalled = true;
        }

        return stub.assertCalled;
    }

    // Get a list of all the assertion object's properties
    const properties = Object.getOwnPropertyNames(Assertion.prototype)
        .map((name) => {
            const descriptor = Object.getOwnPropertyDescriptor(Assertion.prototype, name); descriptor.name = name; return descriptor;
        });

    // For all pure function assertions, exec deferreds before the original function body.
    properties
        .filter((property) => {
            // eslint-disable-next-line adone/no-typeof
            return property.name !== "assert" && property.name !== "constructor" && typeof property.value === "function";
        })
        .forEach((property) => {
            Assertion.overwriteMethod(property.name, (_super) => {
                return function () {
                    const result = execDeferred(this);
                    return _super.apply(result, arguments);
                };
            });
        });

    // For chainable methods, defer the getter, exec deferreds before the assertion function
    properties
        .filter((property) => {
            return Assertion.prototype.__methods.hasOwnProperty(property.name);
        })
        .forEach((property) => {
            Assertion.overwriteChainableMethod(property.name, (_super) => {
                return function () {
                    // Method call of the chainable method
                    const result = execDeferred(this);
                    return _super.apply(result, arguments);
                };
            }, (_super) => {
                return function () {
                    // Getter of chainable method
                    defer(this, _super);
                    return this;
                };
            });
        });

    const getters = properties.filter((property) => {
        return property.name !== "_obj" &&
            // eslint-disable-next-line adone/no-typeof
            typeof property.get === "function" &&
            !Assertion.prototype.__methods.hasOwnProperty(property.name);
    });

    // For all pure properties, defer the getter
    getters
        .filter((property) => {
            return !callsAssert(property.get);
        })
        .forEach((property) => {
            Assertion.overwriteProperty(property.name, (_super) => {
                return function () {
                    defer(this, _super);
                    return this;
                };
            });
        });

    // For all assertion properties, convert it to a chainable
    getters
        .filter((property) => {
            return callsAssert(property.get);
        })
        .forEach((property) => {
            convertAssertionPropertyToChainMethod(property.name, property.get);
        });


    Assertion.addMethod("ensure", function () {
        return execDeferred(this);
    });


    // Hook new property creations
    const addProperty = util.addProperty;
    util.addProperty = function (ctx, name, getter) {
        addProperty.apply(util, arguments);

        // Convert to chained property
        convertAssertionPropertyToChainMethod(name, getter);
    };

    // Hook new method assertions
    const addMethod = util.addMethod;
    util.addMethod = function (ctx, name) {
        addMethod.apply(util, arguments);
        Assertion.overwriteMethod(name, (_super) => {
            return function () {
                const result = execDeferred(this);
                return _super.apply(result, arguments);
            };
        });
    };

    // Hook new chainable methods
    const addChainableMethod = util.addChainableMethod;
    util.addChainableMethod = function (ctx, name) {
        // When overwriting an existing property, don't patch it
        let patch = true;
        if (Assertion.prototype.hasOwnProperty(name)) {
            patch = false;
        }

        addChainableMethod.apply(util, arguments);
        if (patch) {
            Assertion.overwriteChainableMethod(name, (_super) => {
                return function () {
                    // Method call of the chainable method
                    const result = execDeferred(this);
                    return _super.apply(result, arguments);
                };
            }, (_super) => {
                return function () {
                    // Getter of chainable method
                    defer(this, _super);
                    return this;
                };
            });
        }
    };
}
