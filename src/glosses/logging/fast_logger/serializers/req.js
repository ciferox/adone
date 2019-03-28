

module.exports = {
    mapHttpRequest,
    reqSerializer
};

const rawSymbol = Symbol("pino-raw-req-ref");
const pinoReqProto = Object.create({}, {
    id: {
        enumerable: true,
        writable: true,
        value: ""
    },
    method: {
        enumerable: true,
        writable: true,
        value: ""
    },
    url: {
        enumerable: true,
        writable: true,
        value: ""
    },
    headers: {
        enumerable: true,
        writable: true,
        value: {}
    },
    remoteAddress: {
        enumerable: true,
        writable: true,
        value: ""
    },
    remotePort: {
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
Object.defineProperty(pinoReqProto, rawSymbol, {
    writable: true,
    value: {}
});

function reqSerializer(req) {
    // req.info is for hapi compat.
    const connection = req.info || req.connection;
    const _req = Object.create(pinoReqProto);
    _req.id = (is.function(req.id) ? req.id() : (req.id || (req.info ? req.info.id : undefined)));
    _req.method = req.method;
    // req.url.path is  for hapi compat.
    _req.url = req.url ? (req.url.path || req.url) : undefined;
    _req.headers = req.headers;
    _req.remoteAddress = connection && connection.remoteAddress;
    _req.remotePort = connection && connection.remotePort;
    // req.raw is  for hapi compat/equivalence
    _req.raw = req.raw || req;
    return _req;
}

function mapHttpRequest(req) {
    return {
        req: reqSerializer(req)
    };
}
