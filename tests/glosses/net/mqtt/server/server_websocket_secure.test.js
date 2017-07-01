require("./common");
const steed = require("steed");
const ascoltatori = require("ascoltatori");
const abstractServerTests = require("./abstract_server");
const request = require("supertest");
const Connection = require("mqtt-connection");

const SECURE_KEY = `${__dirname}/secure/tls-key.pem`;
const SECURE_CERT = `${__dirname}/secure/tls-cert.pem`;

const createConnection = function (port) {
    const stream = adone.net.ws.stream.createClient(`wss://localhost:${port}`, [], {
        ca: adone.std.fs.readFileSync(SECURE_CERT),
        rejectUnauthorized: false
    });

    const conn = new Connection(stream);

    stream.on("connect", () => {
        conn.emit("connected");
    });

    return conn;
};


const moscaSettings = function () {
    const settings = {
        stats: false,
        logger: {
            level: "error"
        },
        persistence: {
            factory: adone.net.mqtt.server.persistence.Memory
        },
        https: {
            port: nextPort(),
            static: `${__dirname}/static`,
            bundle: true
        },
        secure: {
            keyPath: SECURE_KEY,
            certPath: SECURE_CERT
        },
        onlyHttp: true
    };

    // this is required to make the original server
    // test work
    // TODO refactor abstract test suite to take
    // the port as a parameter
    settings.port = settings.https.port;

    return settings;
};

describe("mosca.Server - Secure Websocket", () => {
    abstractServerTests(moscaSettings, createConnection);

    before((done) => {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // Ignore self-signed certificate errors
        done();
    });

    after((done) => {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";
        done();
    });

    it("should retrieve a static file", (done) => {
        const curPort = nextPort() - 1;
        const req = request(`https://localhost:${curPort}`);

        req.get("/test").expect(200, "42").end(done);
    });

    // it("should serve a browserify bundle", (done) => {
    //     const curPort = nextPort() - 1;
    //     const req = request(`https://localhost:${curPort}`);

    //     req.get("/mqtt.js")
    //         .expect("Content-Type", /javascript/)
    //         .expect(200).end(done);
    // });
});
