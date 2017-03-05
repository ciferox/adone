/* global describe it */


import { SSH2Stream, utils } from "adone/glosses/net/ssh/ssh_streams";
const parseKey = utils.parseKey;
const genPubKey = utils.genPublicKey;

const inherits = adone.std.util.inherits;
const TransformStream = adone.std.stream.Transform;
const fs = adone.std.fs;

const SERVER_KEY = fs.readFileSync(__dirname + "/fixtures/ssh_host_rsa_key");
const HOST_KEYS = {
    "ssh-rsa": makeServerKey(SERVER_KEY)
};

function SimpleStream() {
    TransformStream.call(this);
    this.buffer = "";
}
inherits(SimpleStream, TransformStream);
SimpleStream.prototype._transform = function(chunk, encoding, cb) {
    this.buffer += chunk.toString("binary");
    cb(null, chunk);
};

describe("SSH-Streams", function () {
    describe("SSH", function () {
        it("Custom algorithms", function (done) {
            var algos = ["ssh-dss", "ssh-rsa", "ecdsa-sha2-nistp521"];
            var client = new SSH2Stream({
                algorithms: {
                    serverHostKey: algos
                }
            });
            var clientBufStream = new SimpleStream();
            var clientReady = false;
            var server = new SSH2Stream({
                server: true,
                hostKeys: HOST_KEYS
            });
            var serverBufStream = new SimpleStream();
            var serverReady = false;

            function onNEWKEYS() {
                if (this === client) {
                    assert(!clientReady, "Already received client NEWKEYS event");
                    clientReady = true;
                } else {
                    assert(!serverReady, "Already received server NEWKEYS event");
                    serverReady = true;
                }
                if (clientReady && serverReady) {
                    var traffic = clientBufStream.buffer;
                    var algoList = algos.join(",");
                    var re = new RegExp("\x00\x00\x00" +
                        hexByte(algoList.length) +
                        algoList);
                    assert(re.test(traffic), "Unexpected client algorithms");

                    traffic = serverBufStream.buffer;
                    assert(/\x00\x00\x00\x07ssh-rsa/.test(traffic),
                        "Unexpected server algorithms");

                    done();
                }
            }

            client.on("NEWKEYS", onNEWKEYS);
            server.on("NEWKEYS", onNEWKEYS);

            client.pipe(clientBufStream)
                .pipe(server)
                .pipe(serverBufStream)
                .pipe(client);
        });
    });
});

function makeServerKey(raw) {
    var privateKey = parseKey(raw);
    return {
        privateKey: privateKey,
        publicKey: genPubKey(privateKey)
    };
}

function hexByte(n) {
    return String.fromCharCode(n);
}
