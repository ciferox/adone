const { lazify } = adone;

lazify({
    util: "./util",
    behavior: "./behavior",
    SpyCall: "./spy_call",
    collectOwnMethods: "./collect_own_methods",
    Collection: "./collection",
    color: "./color",
    defaultBehaviors: "./default_behaviors",
    spyFormatters: "./spy_formatters",
    stubDescriptor: "./stub_descriptor",
    stubEntireObject: "./stub_entire_object",
    stubNonFunctionProperty: "./stub_non_function_property",
    throwOnFalsyObject: "./throw_on_falsy_object"
}, exports, require);
