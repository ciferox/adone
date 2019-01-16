const reqSerializers = require("./req");
const resSerializers = require("./res");

module.exports = {
    err: require("./err"),
    mapHttpRequest: reqSerializers.mapHttpRequest,
    mapHttpResponse: resSerializers.mapHttpResponse,
    req: reqSerializers.reqSerializer,
    res: resSerializers.resSerializer,

    wrapRequestSerializer: function wrapRequestSerializer(customSerializer) {
        if (customSerializer === reqSerializers.reqSerializer) {
            return customSerializer;
        }
        return function wrappedReqSerializer(req) {
            return customSerializer(reqSerializers.reqSerializer(req));
        };
    },

    wrapResponseSerializer: function wrapResponseSerializer(customSerializer) {
        if (customSerializer === resSerializers.resSerializer) {
            return customSerializer;
        }
        return function wrappedResSerializer(res) {
            return customSerializer(resSerializers.resSerializer(res));
        };
    }
};
