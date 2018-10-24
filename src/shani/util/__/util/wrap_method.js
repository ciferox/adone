const {
    is,
    error: { InvalidArgument },
    shani: { util: { __ } }
} = adone;

const hasOwn = Object.prototype.hasOwnProperty;

const isFunction = (obj) => is.function(obj) || Boolean(obj && obj.constructor && obj.call && obj.apply);

const mirrorProperties = (target, source) => {
    for (const prop in source) {
        if (!hasOwn.call(target, prop)) {
            target[prop] = source[prop];
        }
    }
};

const restorable = Symbol.for("shani:restorable");

export default function wrapMethod(object, property, method) {
    if (!object) {
        throw new InvalidArgument("Should wrap property of object");
    }

    if (!is.function(method) && !is.object(method)) {
        throw new TypeError("Method wrapper should be a function or a property descriptor");
    }

    const checkWrappedMethod = (wrappedMethod) => {
        let error;

        if (!isFunction(wrappedMethod)) {
            error = new TypeError(`Attempted to wrap ${typeof wrappedMethod} property ${__.util.valueToString(property)} as function`);
        } else if (wrappedMethod.restore && wrappedMethod.restore[restorable]) {
            error = new TypeError(`Attempted to wrap ${__.util.valueToString(property)} which is already wrapped`);
        } else if (wrappedMethod.calledBefore) {
            const verb = wrappedMethod.returns ? "stubbed" : "spied on";
            error = new TypeError(`Attempted to wrap ${__.util.valueToString(property)} which is already ${verb}`);
        }

        if (error) {
            if (wrappedMethod && wrappedMethod.stackTraceError) {
                error.stack += `\n--------------\n${wrappedMethod.stackTraceError.stack}`;
            }
            throw error;
        }
    };

    let wrappedMethod;

    const simplePropertyAssignment = () => {
        wrappedMethod = object[property];
        checkWrappedMethod(wrappedMethod);
        object[property] = method;
        method.displayName = property;
    };

    // Firefox has a problem when using hasOwn.call on objects from other frames.
    const owned = object.hasOwnProperty ? object.hasOwnProperty(property) : hasOwn.call(object, property);

    const methodDesc = is.function(method) ? { value: method } : method;
    const wrappedMethodDesc = __.util.getPropertyDescriptor(object, property);

    let error;
    if (!wrappedMethodDesc) {
        error = new TypeError(`Attempted to wrap ${typeof wrappedMethod} property ${property} as function`);
    } else if (wrappedMethodDesc.restore && wrappedMethodDesc.restore[restorable]) {
        error = new TypeError(`Attempted to wrap ${property} which is already wrapped`);
    }
    if (error) {
        if (wrappedMethodDesc && wrappedMethodDesc.stackTraceError) {
            error.stack += `\n--------------\n${wrappedMethodDesc.stackTraceError.stack}`;
        }
        throw error;
    }

    const types = Object.keys(methodDesc);
    for (let i = 0; i < types.length; i++) {
        wrappedMethod = wrappedMethodDesc[types[i]];
        checkWrappedMethod(wrappedMethod);
    }

    mirrorProperties(methodDesc, wrappedMethodDesc);
    for (let i = 0; i < types.length; i++) {
        mirrorProperties(methodDesc[types[i]], wrappedMethodDesc[types[i]]);
    }
    Object.defineProperty(object, property, methodDesc);

    // catch failing assignment
    // this is the converse of the check in `.restore` below
    if (is.function(method) && object[property] !== method) {
        // correct any wrongdoings caused by the defineProperty call above,
        // such as adding new items (if object was a Storage object)
        delete object[property];
        simplePropertyAssignment();
    }

    method.displayName = property;

    // Set up an Error object for a stack trace which can be used later to find what line of
    // code the original method was created on.
    method.stackTraceError = (new Error("Stack Trace for original"));

    method.restore = function () {
        // For prototype properties try to reset by delete first.
        // If this fails (ex: localStorage on mobile safari) then force a reset
        // via direct assignment.
        if (!owned) {
            // In some cases `delete` may throw an error
            try {
                delete object[property];
            } catch (e) { } // eslint-disable-line no-empty
            // For native code functions `delete` fails without throwing an error
            // on Chrome < 43, PhantomJS, etc.
        } else {
            Object.defineProperty(object, property, wrappedMethodDesc);
        }

        const descriptor = __.util.getPropertyDescriptor(object, property);
        if (descriptor && descriptor.value === method) {
            object[property] = wrappedMethod;
        }
    };

    method.wrappedMethod = wrappedMethod;

    method.restore[restorable] = true;

    return method;
}
