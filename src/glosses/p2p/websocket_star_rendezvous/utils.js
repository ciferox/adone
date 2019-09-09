const {
    multiformat: { mafmt, multiaddr },
    p2p: { PeerId, crypto }
} = adone;


function isIP(ma) {
    const protos = ma.protos();

    if (protos[0].code !== 4 && protos[0].code !== 41) {
        return false;
    }
    if (protos[1].code !== 6 && protos[1].code !== 17) {
        return false;
    }

    return true;
}

function cleanUrlSIO(ma) {
    const maStrSplit = ma.toString().split('/')

    if (isIP(ma)) {
        if (maStrSplit[1] === 'ip4') {
            return 'http://' + maStrSplit[2] + ':' + maStrSplit[4]
        } else if (maStrSplit[1] === 'ip6') {
            return 'http://[' + maStrSplit[2] + ']:' + maStrSplit[4]
        }
        throw new Error('invalid multiaddr: ' + ma.toString())

    } else if (multiaddr.isName(ma)) {
        const wsProto = ma.protos()[1].name
        if (wsProto === 'ws') {
            return 'http://' + maStrSplit[2]
        } else if (wsProto === 'wss') {
            return 'https://' + maStrSplit[2]
        } else {
            throw new Error('invalid multiaddr: ' + ma.toString())
        }
    } else {
        throw new Error('invalid multiaddr: ' + ma.toString())
    }
}

const types = {
    string: (v) => (is.string(v)),
    object: (v) => (typeof v === "object"),
    multiaddr: (v) => {
        if (!types.string(v)) {
            return;
        }

        try {
            multiaddr(v);
            return true;
        } catch (err) {
            return false;
        }
    },
    function: (v) => (is.function(v))
};

function validate(def, data) {
    if (!is.array(data)) { throw new Error('Data is not an array') };
    def.forEach((type, index) => {
        if (!types[type]) {
            throw new Error("Type " + type + " does not exist");
        }

        if (!types[type](data[index])) {
            throw new Error("Data at index " + index + " is invalid for type " + type);
        }
    });
}

function Protocol(log) {
    log = log || function noop() { };

    this.requests = {};
    this.addRequest = (name, def, handle) => {
        this.requests[name] = { def, handle };
    };
    this.handleSocket = (socket) => {
        socket.r = {};
        for (const request in this.requests) {
            if (Object.prototype.hasOwnProperty.call(this.requests, request)) {
                const r = this.requests[request];
                socket.on(request, function () {
                    const data = [...arguments];
                    try {
                        validate(r.def, data);
                        data.unshift(socket);
                        r.handle.apply(null, data);
                    } catch (err) {
                        log(err);
                        log("peer %s has sent invalid data for request %s", socket.id || "<server>", request, data);
                    }
                });
            }
        }
    };
}

async function getIdAndValidate(pub, id) {
    const _id = await Id.createFromPubKey(Buffer.from(pub, "hex"));
    if (_id.toB58String() !== id) {
        throw Error("Id is not matching");
    }

    return crypto.keys.unmarshalPublicKey(Buffer.from(pub, "hex"));
}

exports = module.exports;
exports.cleanUrlSIO = cleanUrlSIO;
exports.validate = validate;
exports.Protocol = Protocol;
exports.getIdAndValidate = getIdAndValidate;
exports.validateMa = (ma) => mafmt.WebSocketStar.matches(multiaddr(ma));
