const errSerializer = require("./err");
const reqSerializers = require("./req");
const resSerializers = require("./res");

module.exports = {
    err: errSerializer,
    mapHttpRequest: reqSerializers.mapHttpRequest,
    mapHttpResponse: resSerializers.mapHttpResponse,
    req: reqSerializers.reqSerializer,
    res: resSerializers.resSerializer,

    wrapErrorSerializer: function wrapErrorSerializer(customSerializer) {
        if (customSerializer === errSerializer) {
            return customSerializer; 
        }
        return function wrapErrSerializer(err) {
            return customSerializer(errSerializer(err));
        };
    },

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
