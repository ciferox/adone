import {
    fail,
    succeed,
    kCallback,
    succeedIfAttributeEquals,
    nodeify
} from "./support";

const {
    std: {
        net,
        util: { format }
    }
} = adone;

const {
    connect,
    credentials
} = adone.net.amqp;

const {
    connect: { credentialsFromUrl }
} = adone.private(adone.net.amqp);

const rabbitMQHost = process.env.RABBITMQ_HOST || "localhost";

const URL = `amqp://${rabbitMQHost}`;

const urlparse = (url) => {
    return adone.uri.parse(url);
};
describe("net", "amqp", () => {
    describe("Credentials", () => {
        const checkCreds = (creds, user, pass, done) => {
            if (creds.mechanism !== "PLAIN") {
                return done("expected mechanism PLAIN");
            }
            if (creds.username !== user || creds.password !== pass) {
                return done(format("expected '%s', '%s'; got '%s', '%s'",
                    user, pass, creds.username, creds.password));
            }
            done();
        };

        it("no creds", (done) => {
            const parts = urlparse("amqp://localhost", true);
            const creds = credentialsFromUrl(parts);
            checkCreds(creds, "guest", "guest", done);
        });

        it("usual user:pass", (done) => {
            const parts = urlparse("amqp://user:pass@localhost");
            const creds = credentialsFromUrl(parts);
            checkCreds(creds, "user", "pass", done);
        });

        it("missing user", (done) => {
            const parts = urlparse("amqps://:password@localhost");
            const creds = credentialsFromUrl(parts);
            checkCreds(creds, "", "password", done);
        });

        it("missing password", (done) => {
            const parts = urlparse("amqps://username:@localhost");
            const creds = credentialsFromUrl(parts);
            checkCreds(creds, "username", "", done);
        });

        it("escaped colons", (done) => {
            const parts = urlparse("amqp://user%3Aname:pass%3Aword@localhost");
            const creds = credentialsFromUrl(parts);
            checkCreds(creds, "user:name", "pass:word", done);
        });
    });

    describe("Connect API", () => {
        it("Connection refused", (done) => {
            nodeify(connect("amqp://localhost:23450", {}), kCallback(fail(done), succeed(done)));
        });

        it("bad URL", async () => {
            await assert.throws(async () => {
                await connect("blurble");
            });
        });

        it("wrongly typed open option", (done) => {
            const url = require("url");
            const parts = url.parse(URL, true);
            const q = parts.query || {};
            q.frameMax = "NOT A NUMBER";
            parts.query = q;
            const u = url.format(parts);
            nodeify(connect(u, {}), kCallback(fail(done), succeed(done)));
        });

        it("using custom heartbeat option", (done) => {
            const url = require("url");
            const parts = url.parse(URL, true);
            const config = parts.query || {};
            config.heartbeat = 20;
            nodeify(connect(url.format(parts), {}).then((x) => x.connection), kCallback(succeedIfAttributeEquals("heartbeat", 20, done), fail(done)));
        });

        it("wrongly typed heartbeat option", (done) => {
            const url = require("url");
            const parts = url.parse(URL, true);
            const config = parts.query || {};
            config.heartbeat = "NOT A NUMBER";
            nodeify(connect(config, {}), kCallback(fail(done), succeed(done)));
        });

        it("using plain credentials", (done) => {
            const url = require("url");
            const parts = url.parse(URL, true);
            let u = "guest";
            let p = "guest";
            if (parts.auth) {
                const auth = parts.auth.split(":");
                u = auth[0], p = auth[1];
            }
            nodeify(connect(URL, { credentials: credentials.plain(u, p) }), kCallback(succeed(done), fail(done)));
        });

        it("using unsupported mechanism", (done) => {
            const creds = {
                mechanism: "UNSUPPORTED",
                response() {
                    return Buffer.from("");
                }
            };
            nodeify(connect(URL, { credentials: creds }), kCallback(fail(done), succeed(done)));
        });

        it("with a given connection timeout", async () => {
            const timeoutServer = net.createServer(() => { });

            await new Promise((resolve) => {
                timeoutServer.listen(31991, resolve);
            });

            try {
                await assert.throws(async () => {
                    await connect("amqp://localhost:31991", { timeout: 50 });
                }, "TIMEDOUT");
            } finally {
                timeoutServer.close();
            }
        });
    });
});
