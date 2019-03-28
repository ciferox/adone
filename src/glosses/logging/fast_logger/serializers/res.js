

module.exports = {
    mapHttpResponse,
    resSerializer
};

const rawSymbol = Symbol("pino-raw-res-ref");
const pinoResProto = Object.create({}, {
    statusCode: {
        enumerable: true,
        writable: true,
        value: 0
    },
    headers: {
        enumerable: true,
        writable: true,
        value: ""
    },
    raw: {
        enumerable: false,
        get() {
            return this[rawSymbol];
        },
        set(val) {
            this[rawSymbol] = val;
        }
    }
});
Object.defineProperty(pinoResProto, rawSymbol, {
    writable: true,
    value: {}
});

function resSerializer(res) {
    const _res = Object.create(pinoResProto);
    _res.statusCode = res.statusCode;
    _res.headers = res._headers;
    _res.raw = res;
    return _res;
}

function mapHttpResponse(res) {
    return {
        res: resSerializer(res)
    };
}
