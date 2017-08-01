const { is, shani: { util } } = adone;
const { __ } = util;


// This is deprecated and will be removed in a future version.
// We will only consider pull requests that fix serious bugs in the implementation
export default function sandboxStub(object, property, ...args) {
    if (args.length) {
        throw new TypeError("stub(obj, 'meth', fn) has been removed, see documentation");
    }

    __.throwOnFalsyObject(object, property, ...args);

    const actualDescriptor = __.util.getPropertyDescriptor(object, property);
    const isStubbingEntireObject = is.undefined(property) && is.object(object);
    const isStubbingNonFuncProperty = is.object(object) &&
                                      !is.undefined(property) &&
                                      (is.undefined(actualDescriptor) || !is.function(actualDescriptor.value));


    // When passing a value as third argument it will be applied to stubNonFunctionProperty
    const stubbed = isStubbingNonFuncProperty
        ? __.stubNonFunctionProperty(object, property, ...args)
        : util.stub(object, property, ...args);

    if (isStubbingEntireObject) {
        const ownMethods = __.util.collectOwnMethods(stubbed);
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
