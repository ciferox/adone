const {
    is, x, util,
    shani: { util: { __: { util: { wrapMethod } }, spy } }
} = adone;


// This is deprecated and will be removed in a future version.
// We will only consider pull requests that fix serious bugs in the implementation
export default function stubDescriptor(object, property, descriptor) {
    let wrapper;

    adone.warn(
      "stub(obj, 'meth', fn) is deprecated and will be removed from " +
      "the public API in a future version." +
      "\n Use stub(obj, 'meth').callsFake(fn)."
    );

    if (Boolean(descriptor) && !is.function(descriptor) && !is.object(descriptor)) {
        throw new x.InvalidArgument("Custom stub should be a property descriptor");
    }

    if (is.emptyObject(descriptor)) {
        throw new x.InvalidArgument("Expected property descriptor to have at least one key");
    }

    if (is.function(descriptor)) {
        wrapper = spy && spy.create ? spy.create(descriptor) : descriptor;
    } else {
        wrapper = descriptor;
        if (spy && spy.create) {
            for (const type of util.keys(wrapper)) {
                wrapper[type] = spy.create(wrapper[type]);
            }
        }
    }

    return wrapMethod(object, property, wrapper);
}
