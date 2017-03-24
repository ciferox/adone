const imports = adone.lazify({
    Request: "./core/request",
    defaults: "./defaults"
}, null, require);

function createInstance(defaultConfig) {
    const context = new imports.Request(defaultConfig);
    const instance = context.request.bind(context);

    instance.request = context.request;

    // Copy axios.prototype to instance
    adone.vendor.lodash.extend(instance, imports.Request.prototype, context);

    // Copy context to instance
    adone.vendor.lodash.extend(instance, context);

    return instance;
}

// Create the default instance to be exported
const request = createInstance(imports.defaults);

// Factory for creating new instances
request.create = (instanceConfig) => createInstance(adone.vendor.lodash.merge({}, imports.defaults, instanceConfig));

// Expose Cancel & CancelToken

adone.lazify({
    Cancel: "./cancel/cancel",
    CancelToken: "./cancel/cancel_token",
    isCancel: "./cancel/is_cancel"
}, request, require);

export default request;
