const { SSH2Stream, util } = adone.net.ssh;
const parseKey = util.parseKey;
const genPubKey = util.genPublicKey;
const fs = adone.std.fs;

const makeServerKey = (raw) => {
    const privateKey = parseKey(raw);
    return {
        privateKey,
        publicKey: genPubKey(privateKey)
    };
};

const hexByte = (n) => String.fromCharCode(n);

const SERVER_KEY = fs.readFileSync(`${__dirname}/fixtures/ssh_host_rsa_key`);
const HOST_KEYS = {
    "ssh-rsa": makeServerKey(SERVER_KEY)
};

class SimpleStream extends adone.std.stream.Transform {
    constructor() {
        super();
        this.buffer = "";
    }

    _transform(chunk, encoding, cb) {
        this.buffer += chunk.toString("binary");
        cb(null, chunk);
    }
}

describe("net", "ssh", "streams", "SSH", () => {
    it("Custom algorithms", (done) => {
        const algos = ["ssh-dss", "ssh-rsa", "ecdsa-sha2-nistp521"];
        const client = new SSH2Stream({
            algorithms: {
                serverHostKey: algos
            }
        });
        const clientBufStream = new SimpleStream();
        let clientReady = false;
        const server = new SSH2Stream({
            server: true,
            hostKeys: HOST_KEYS
        });
        const serverBufStream = new SimpleStream();
        let serverReady = false;

        const onNEWKEYS = function () {
            if (this === client) {
                assert(!clientReady, "Already received client NEWKEYS event");
                clientReady = true;
            } else {
                assert(!serverReady, "Already received server NEWKEYS event");
                serverReady = true;
            }
            if (clientReady && serverReady) {
                let traffic = clientBufStream.buffer;
                const algoList = algos.join(",");
                const re = new RegExp(`\x00\x00\x00${
                    hexByte(algoList.length)
                }${algoList}`);
                assert(re.test(traffic), "Unexpected client algorithms");

                traffic = serverBufStream.buffer;
                assert(/\x00\x00\x00\x07ssh-rsa/.test(traffic),
                    "Unexpected server algorithms");

                done();
            }
        };

        client.on("NEWKEYS", onNEWKEYS);
        server.on("NEWKEYS", onNEWKEYS);

        client.pipe(clientBufStream)
            .pipe(server)
            .pipe(serverBufStream)
            .pipe(client);
    });

    specify("Remote ident is not trimmed", (done) => {
        const serverIdent = "testing  \t";
        const expectedFullIdent = `SSH-2.0-${serverIdent}`;

        const client = new SSH2Stream({});
        client.on("header", (header) => {
            assert(header.identRaw === expectedFullIdent);
            done();
        });

        const server = new SSH2Stream({
            server: true,
            hostKeys: HOST_KEYS,
            ident: serverIdent
        });

        client.pipe(server).pipe(client);
    });
});
