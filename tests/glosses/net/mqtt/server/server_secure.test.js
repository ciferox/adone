require("./common");
const abstractServerTests = require("./abstract_server");
const createConnection = require("./helpers/createConnection");

const SECURE_KEY = `${__dirname}/secure/tls-key.pem`;
const SECURE_CERT = `${__dirname}/secure/tls-cert.pem`;

const moscaSettings = function () {
    const port = nextPort();
    const settings = {
        stats: false,
        logger: {
            level: "error"
        },
        persistence: {
            factory: adone.net.mqtt.server.persistence.Memory
        },
        secure: {
            port,
            keyPath: SECURE_KEY,
            certPath: SECURE_CERT
        }
    };

    // this is required to make the original server
    // test work
    // TODO refactor abstract test suite to take
    // the port as a parameter
    settings.port = port;

    return settings;
};

describe("mosca.Server - Secure Connection", () => {
    abstractServerTests(moscaSettings, require("./helpers/createSecureConnection"));
});

describe("mosca.Server - Secure and non-secure Connection", () => {
    let settings;
    let instance;
    let conn;

    afterEach((done) => {
        if (conn) {
            conn.stream.end();
            conn.on("close", () => {
                instance.close(done);
            });
        } else {
            instance.close(done);
        }
    });

    it("should not allow non-secure connections", (done) => {
        settings = moscaSettings();
        settings.secure.port = nextPort();

        instance = new adone.net.mqtt.server.Server(settings, () => {
            conn = createConnection(settings.port);
            conn.once("error", (err) => {
                conn = null;
                done();
            });
        });
    });

    it("should allow non-secure connections", (done) => {
        settings = moscaSettings();
        settings.allowNonSecure = true;
        settings.secure.port = nextPort();

        instance = new adone.net.mqtt.server.Server(settings, () => {
            conn = createConnection(settings.port);
            conn.on("connected", (err) => {

                done();
            });
        });
    });
});
