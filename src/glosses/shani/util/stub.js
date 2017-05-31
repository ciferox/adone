const {
    is, x, util,
    shani: { util: sutil }
} = adone;

const {
    __: {
        behavior,
        defaultBehaviors: behaviors,
        util: {
            functionToString,
            getPropertyDescriptor,
            wrapMethod
        },
        stubDescriptor,
        stubEntireObject,
        throwOnFalsyObject
    },
    spy
 } = sutil;

// eslint-disable-next-line no-use-before-define
const getParentBehaviour = (stubInstance) => stubInstance.parent && getCurrentBehavior(stubInstance.parent);

const getDefaultBehavior = (stubInstance) => {
    return stubInstance.defaultBehavior || getParentBehaviour(stubInstance) || behavior.create(stubInstance);
};

const getCurrentBehavior = (stubInstance) => {
    const currentBehavior = stubInstance.behaviors[stubInstance.callCount - 1];
    return currentBehavior && currentBehavior.isPresent() ? currentBehavior : getDefaultBehavior(stubInstance);
};

let uuid = 0;

const proto = {
    create(stubLength) {
        let functionStub = function (...args) {
            return getCurrentBehavior(functionStub).invoke(this, args);
        };

        functionStub.id = `stub#${uuid++}`;
        const orig = functionStub;
        functionStub = spy.create(functionStub, stubLength);
        functionStub.func = orig;

        Object.assign(functionStub, stub);
        functionStub.instantiateFake = stub.create;
        functionStub.displayName = "stub";
        functionStub.toString = functionToString;

        functionStub.defaultBehavior = null;
        functionStub.behaviors = [];

        return functionStub;
    },
    resetBehavior() {
        const fakes = this.fakes || [];

        this.defaultBehavior = null;
        this.behaviors = [];

        delete this.returnValue;
        delete this.returnArgAt;
        delete this.throwArgAt;
        delete this.fakeFn;
        this.returnThis = false;

        fakes.forEach((fake) => {
            fake.resetBehavior();
        });
    },
    resetHistory: spy.reset,
    reset() {
        this.resetHistory();
        this.resetBehavior();
    },
    onCall(index) {
        if (!this.behaviors[index]) {
            this.behaviors[index] = behavior.create(this);
        }

        return this.behaviors[index];
    },
    onFirstCall() {
        return this.onCall(0);
    },
    onSecondCall() {
        return this.onCall(1);
    },
    onThirdCall() {
        return this.onCall(2);
    }
};

for (const name of util.keys(behavior)) {
    if (behavior.hasOwnProperty(name) &&
        !proto.hasOwnProperty(name) &&
        name !== "create" &&
        name !== "withArgs" &&
        name !== "invoke") {
        proto[name] = behavior.createBehavior(name);
    }
}

for (const name of util.keys(behaviors)) {
    if (behaviors.hasOwnProperty(name) && !proto.hasOwnProperty(name)) {
        behavior.addBehavior(stub, name, behaviors[name]);
    }
}

export default function stub(object, property, descriptor) {
    throwOnFalsyObject(object, property, descriptor);

    const actualDescriptor = getPropertyDescriptor(object, property);
    const isStubbingEntireObject = is.undefined(property) && is.object(object) && !is.function(object);
    const isCreatingNewStub = !object && is.undefined(property);
    const isStubbingDescriptor = object && property && Boolean(descriptor);

    const isStubbingNonFuncProperty = is.object(object)
        && !is.undefined(property)
        && (is.undefined(actualDescriptor) || !is.function(actualDescriptor.value)) &&
        is.undefined(descriptor);

    const isStubbingExistingMethod = !isStubbingDescriptor &&
        is.object(object) &&
        !is.undefined(actualDescriptor) &&
        is.function(actualDescriptor.value);

    const arity = isStubbingExistingMethod ? object[property].length : 0;

    if (isStubbingEntireObject) {
        return stubEntireObject(stub, object);
    }

    if (isStubbingDescriptor) {
        return stubDescriptor(object, property, descriptor);
    }

    if (isCreatingNewStub) {
        return stub.create();
    }

    const s = stub.create(arity);
    s.rootObj = object;
    s.propName = property;
    s.restore = function restore() {
        if (!is.undefined(actualDescriptor)) {
            Object.defineProperty(object, property, actualDescriptor);
            return;
        }

        delete object[property];
    };

    return isStubbingNonFuncProperty ? s : wrapMethod(object, property, s);
}

stub.createStubInstance = function (constructor) {
    if (!is.function(constructor)) {
        throw new x.InvalidArgument("The constructor should be a function.");
    }
    return stub(Object.create(constructor.prototype));
};

Object.assign(stub, proto);
