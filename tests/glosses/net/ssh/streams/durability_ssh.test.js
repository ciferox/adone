const { SSH2Stream } = adone.net.ssh;

const fs = adone.std.fs;
const path = adone.std.path;
const inspect = adone.std.util.inspect;
const inherits = adone.std.util.inherits;
const TransformStream = adone.std.stream.Transform;

const fixturesdir = path.join(__dirname, "fixtures");

const HOST_KEY_RSA = fs.readFileSync(path.join(fixturesdir, "ssh_host_rsa_key"));
const SERVER_CONFIG = {
    server: true,
    hostKeys: { "ssh-rsa": HOST_KEY_RSA }
};

function SimpleStream() {
    TransformStream.call(this);
    this.buffer = "";
}
inherits(SimpleStream, TransformStream);
SimpleStream.prototype._transform = function (chunk, encoding, cb) {
    this.buffer += chunk.toString("binary");
    cb();
};

describe("SSH-Streams", () => {
    describe("durability.ssh", () => {
        it("Incompatible client SSH protocol version", (done) => {
            let serverError = false;
            const server = new SSH2Stream(SERVER_CONFIG);
            const client = new SimpleStream();

            client.pipe(server).pipe(client);

            server.on("error", (err) => {
                serverError = err;
                assert(err.message === "Protocol version not supported", "Wrong error message");
            }).on("end", () => {
                assert(client.buffer === `${server.config.ident}\r\n`, `Wrong server ident: ${inspect(client.buffer)}`);
                assert(serverError, "Expected server error");
                done();
            });

            client.push("SSH-1.0-aaa\r\n");
        });

        it("Malformed client protocol identification", (done) => {
            let serverError = false;
            const server = new SSH2Stream(SERVER_CONFIG);
            const client = new SimpleStream();

            client.pipe(server).pipe(client);

            server.on("error", (err) => {
                serverError = err;
                assert(err.message === "Bad identification start", "Wrong error message");
            }).on("end", () => {
                assert(client.buffer === `${server.config.ident}\r\n`, `Wrong server ident: ${inspect(client.buffer)}`);
                assert(serverError, "Expected server error");
                done();
            });
            client.push("LOL-2.0-asdf\r\n");
        });

        it("SSH client protocol identification too long (> 255 characters)", (done) => {
            let serverError = false;
            const server = new SSH2Stream(SERVER_CONFIG);
            const client = new SimpleStream();

            client.pipe(server).pipe(client);

            server.on("error", (err) => {
                serverError = err;
                assert(err.message === "Max identification string size exceeded", "Wrong error message");
            }).on("end", () => {
                assert(client.buffer === `${server.config.ident}\r\n`, `Wrong server ident: ${inspect(client.buffer)}`);
                assert(serverError, "Expected server error");
                done();
            });
            let ident = "SSH-2.0-";
            for (let i = 0; i < 30; ++i) {
                ident += "foobarbaz";
            }
            ident += "\r\n";
            client.push(ident);
        });

        it("Bad packet length (max)", (done) => {
            let serverError = false;
            const server = new SSH2Stream(SERVER_CONFIG);
            const client = new SimpleStream();

            client.pipe(server).pipe(client);

            server.on("error", (err) => {
                serverError = err;
                assert(err.message === "Bad packet length", "Wrong error message");
            }).on("end", () => {
                assert(client.buffer.length, "Expected server data");
                assert(serverError, "Expected server error");
                done();
            });
            client.push("SSH-2.0-asdf\r\n");
            // 500,000 byte packet_length
            client.push(new Buffer([0x00, 0x07, 0xA1, 0x20, 0x00, 0x00, 0x00, 0x00]));
        });

        it("Bad packet length (min)", (done) => {
            let serverError = false;
            const server = new SSH2Stream(SERVER_CONFIG);
            const client = new SimpleStream();

            client.pipe(server).pipe(client);

            server.on("error", (err) => {
                serverError = err;
                assert(err.message === "Bad packet length", "Wrong error message");
            }).on("end", () => {
                assert(client.buffer.length, "Expected server data");
                assert(serverError, "Expected server error");
                done();
            });
            client.push("SSH-2.0-asdf\r\n");
            client.push(new Buffer([0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00]));
        });
    });
});
