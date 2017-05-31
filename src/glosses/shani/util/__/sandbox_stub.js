const {
    is,
    shani: {
        util: {
            __: {
                util: { collectOwnMethods, getPropertyDescriptor },
                stubNonFunctionProperty,
                throwOnFalsyObject
            },
            stub
        }
    }
} = adone;


// This is deprecated and will be removed in a future version.
// We will only consider pull requests that fix serious bugs in the implementation
export default function sandboxStub(object, property, ...args) {
    adone.warn(
      "sandbox.stub(obj, 'meth', val) is deprecated and will be removed from " +
      "the public API in a future version." +
      "\n Use sandbox.stub(obj, 'meth').callsFake(fn) instead in order to stub a function." +
      "\n Use sandbox.stub(obj, 'meth').value(fn) instead in order to stub a non-function value."
    );

    throwOnFalsyObject(object, property, ...args);

    const actualDescriptor = getPropertyDescriptor(object, property);
    const isStubbingEntireObject = is.undefined(property) && is.object(object);
    const isStubbingNonFuncProperty = is.object(object) &&
                                      !is.undefined(property) &&
                                      (is.undefined(actualDescriptor) || !is.function(actualDescriptor.value));


    // When passing a value as third argument it will be applied to stubNonFunctionProperty
    const stubbed = isStubbingNonFuncProperty
        ? stubNonFunctionProperty(object, property, ...args)
        : stub(object, property, ...args);

    if (isStubbingEntireObject) {
        const ownMethods = collectOwnMethods(stubbed);
        ownMethods.forEach(this.add.bind(this));
        if (this.promiseLibrary) {
            ownMethods.forEach(this.addUsingPromise.bind(this));
        }
    } else {
        this.add(stubbed);
        if (this.promiseLibrary) {
            stubbed.usingPromise(this.promiseLibrary);
        }
    }

    return stubbed;
}
