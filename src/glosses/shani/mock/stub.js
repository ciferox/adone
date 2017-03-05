/**
 * Stub functions
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
import adone from "adone";
import getPropertyDescriptor from "./util/get-property-descriptor";
import behavior from "./behavior";
import spy from "./spy";
import extend from "./util/extend";
import walk from "./util/walk";
import createInstance from "./util/create";
import functionToString from "./util/function-to-string";
import valueToString from "./util/value-to-string";
import wrapMethod from "./util/wrap-method";

function stub(object, property, descriptor) {
    if (descriptor && typeof descriptor === "function") {
        throw new adone.x.InvalidArgument("Use stub(obj, 'meth').callsFake(fn)");
    }
    if (descriptor && typeof descriptor !== "function" && typeof descriptor !== "object") {
        throw new TypeError("Custom stub should be a property descriptor");
    }

    if (typeof descriptor === "object" && adone.util.keys(descriptor).length === 0) {
        throw new TypeError("Expected property descriptor to have at least one key");
    }

    if (property && !object) {
        const type = object === null ? "null" : "undefined";
        throw new Error("Trying to stub property '" + valueToString(property) + "' of " + type);
    }

    if (!object && typeof property === "undefined") {
        return stub.create();
    }

    let wrapper;
    if (descriptor) {
        if (typeof descriptor === "function") {
            wrapper = spy && spy.create ? spy.create(descriptor) : descriptor;
        } else {
            wrapper = descriptor;
            if (spy && spy.create) {
                const types = adone.util.keys(wrapper);
                for (let i = 0; i < types.length; i++) {
                    wrapper[types[i]] = spy.create(wrapper[types[i]]);
                }
            }
        }
    } else {
        let stubLength = 0;
        if (typeof object === "object" && typeof object[property] === "function") {
            stubLength = object[property].length;
        }
        wrapper = stub.create(stubLength);
    }

    if (typeof property === "undefined" && typeof object === "object") {
        walk(object || {}, function (prop, propOwner) {
            // we don't want to stub things like toString(), valueOf(), etc. so we only stub if the object
            // is not Object.prototype
            if (
                propOwner !== Object.prototype &&
                prop !== "constructor" &&
                typeof getPropertyDescriptor(propOwner, prop).value === "function"
            ) {
                stub(object, prop);
            }
        });

        return object;
    }

    return wrapMethod(object, property, wrapper);
}

/*eslint-disable no-use-before-define*/
function getParentBehaviour(stubInstance) {
    return (stubInstance.parent && getCurrentBehavior(stubInstance.parent));
}

function getDefaultBehavior(stubInstance) {
    return stubInstance.defaultBehavior ||
            getParentBehaviour(stubInstance) ||
            behavior.create(stubInstance);
}

function getCurrentBehavior(stubInstance) {
    const currentBehavior = stubInstance.behaviors[stubInstance.callCount - 1];
    return currentBehavior && currentBehavior.isPresent() ? currentBehavior : getDefaultBehavior(stubInstance);
}
/*eslint-enable no-use-before-define*/

let uuid = 0;

const proto = {
    create: function create(stubLength) {
        let functionStub = function () {
            return getCurrentBehavior(functionStub).invoke(this, arguments);
        };

        functionStub.id = "stub#" + uuid++;
        const orig = functionStub;
        functionStub = spy.create(functionStub, stubLength);
        functionStub.func = orig;

        extend(functionStub, stub);
        functionStub.instantiateFake = stub.create;
        functionStub.displayName = "stub";
        functionStub.toString = functionToString;

        functionStub.defaultBehavior = null;
        functionStub.behaviors = [];

        return functionStub;
    },

    resetBehavior: function () {
        let i;

        this.defaultBehavior = null;
        this.behaviors = [];

        delete this.returnValue;
        delete this.returnArgAt;
        delete this.fakeFn;
        this.returnThis = false;

        if (this.fakes) {
            for (i = 0; i < this.fakes.length; i++) {
                this.fakes[i].resetBehavior();
            }
        }
    },

    resetHistory: spy.reset,

    reset: function () {
        this.resetHistory();
        this.resetBehavior();
    },

    onCall: function onCall(index) {
        if (!this.behaviors[index]) {
            this.behaviors[index] = behavior.create(this);
        }

        return this.behaviors[index];
    },

    onFirstCall: function onFirstCall() {
        return this.onCall(0);
    },

    onSecondCall: function onSecondCall() {
        return this.onCall(1);
    },

    onThirdCall: function onThirdCall() {
        return this.onCall(2);
    }
};

function createBehavior(behaviorMethod) {
    return function () {
        this.defaultBehavior = this.defaultBehavior || behavior.create(this);
        this.defaultBehavior[behaviorMethod].apply(this.defaultBehavior, arguments);
        return this;
    };
}

for (const method in behavior) {
    if (behavior.hasOwnProperty(method) &&
        !proto.hasOwnProperty(method) &&
        method !== "create" &&
        method !== "withArgs" &&
        method !== "invoke") {
        proto[method] = createBehavior(method);
    }
}

extend(stub, proto);

export default stub;
export function createStubInstance(constructor) {
    if (typeof constructor !== "function") {
        throw new TypeError("The constructor should be a function.");
    }
    return stub(createInstance(constructor.prototype));
}
