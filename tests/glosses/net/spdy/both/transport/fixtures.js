const streamPair = require("stream-pair");

const {
    net: { spdy: transport }
} = adone;

exports.pair = null;
exports.server = null;
exports.client = null;

const expectData = function (stream, expected, callback) {
    let actual = "";

    stream.on("data", (chunk) => {
        actual += chunk;
    });
    stream.on("end", () => {
        assert.equal(actual, expected);
        callback();
    });
};
exports.expectData = expectData;

const protocol = function (name, version, body) {
    describe(`${name} (v${version})`, () => {
        beforeEach(() => {
            exports.pair = streamPair.create();

            exports.server = transport.Connection.create(exports.pair, {
                protocol: name,
                windowSize: 256,
                isServer: true
            });
            exports.client = transport.Connection.create(exports.pair.other, {
                protocol: name,
                windowSize: 256,
                isServer: false
            });

            exports.client.start(version);
        });

        body(name, version);
    });
};
exports.protocol = protocol;

const everyProtocol = function (body) {
    protocol("http2", 4, body);
    protocol("spdy", 2, body);
    protocol("spdy", 3, body);
    protocol("spdy", 3.1, body);
};
exports.everyProtocol = everyProtocol;
