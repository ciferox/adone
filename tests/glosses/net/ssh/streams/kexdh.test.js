const { stream } = adone.net.ssh;
const { SSH2Stream, util } = stream;

const parseKey = util.parseKey;
const genPubKey = util.genPublicKey;
const MESSAGE = stream.const.MESSAGE;

const fs = adone.std.fs;

const SERVER_KEY = fs.readFileSync(adone.std.path.join(__dirname, "fixtures", "ssh_host_rsa_key"));
const SERVER_KEY_PRV = parseKey(SERVER_KEY);
const SERVER_KEY_PUB = genPubKey(SERVER_KEY_PRV);

describe("SSH-Streams", () => {
    describe("kexdh", () => {
        it("kexdh", (done) => {
            const server = new SSH2Stream({
                server: true,
                hostKeys: {
                    "ssh-rsa": {
                        privateKey: SERVER_KEY_PRV,
                        publicKey: SERVER_KEY_PUB
                    }
                }
            });
            const client = new SSH2Stream();
            let srvError;

            server.on("error", (err) => {
                assert(err);
                assert(/unexpected/.test(err.message));
                assert(!srvError);
                srvError = err;
            });

            // Removed "KEXDH_REPLY" listeners as it causes client to send "NEWKEYS" which
            // changes server's state.
            client.removeAllListeners("KEXDH_REPLY");
            // Removed 'NEWKEYS' listeners as server sends 'NEWKEYS' after receiving
            // 'KEXDH_INIT' which causes errors on client if 'NEWKEYS' is processed
            // without processing 'KEXDH_REPLY'
            client.removeAllListeners("NEWKEYS");
            // Added 'KEXDH_REPLY' which violates protocol and re-sends 'KEXDH_INIT'
            // packet
            client.on("KEXDH_REPLY", (info) => {
                const state = client._state;
                const outstate = state.outgoing;
                const buf = new Buffer(1 + 4 + outstate.pubkey.length);
                buf[0] = MESSAGE.KEXDH_INIT;
                buf.writeUInt32BE(outstate.pubkey.length, 1, true);
                outstate.pubkey.copy(buf, 5);
                SSH2Stream._send(client, buf, undefined, true);
            });
            client.on("error", (err) => {
                assert(err);
                assert.equal(
                    err.message,
                    "PROTOCOL_ERROR",
                    `Expected Error: PROTOCOL_ERROR Got Error: ${err.message}`
                );
                done();
            });
            client.pipe(server).pipe(client);
        });
    });
});
