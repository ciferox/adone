require("./common");
const steed = require("steed");
const ascoltatori = require("ascoltatori");
const abstractServerTests = require("./abstract_server");
const request = require("supertest");

const { Connection } = adone.net.mqtt.connection;

const createConnection = (port) => {
    const stream = adone.net.ws.stream.createClient(`ws://localhost:${port}`);
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
        http: {
            port: nextPort(),
            static: `${__dirname}/static`,
            bundle: true
        },
        onlyHttp: true
    };

    // this is required to make the original server
    // test work
    // TODO refactor abstract test suite to take
    // the port as a parameter
    settings.port = settings.http.port;

    return settings;
};

describe("mosca.Server - Websocket", () => {
    abstractServerTests(moscaSettings, createConnection);

    it("should retrieve a static file", (done) => {
        const curPort = nextPort() - 1;
        const req = request(`http://localhost:${curPort}`);

        req.get("/test").expect(200, "42").end(done);
    });

    it("should serve the 'index.html' file in the static folder as '/'", (done) => {
        const curPort = nextPort() - 1;
        const req = request(`http://localhost:${curPort}`);

        req.get("/").expect(200, "Hello World\n").end(done);
    });

    // it("should serve a browserify bundle", (done) => {
    //     const curPort = nextPort() - 1;
    //     const req = request(`http://localhost:${curPort}`);

    //     req.get("/mqtt.js")
    //         .expect("Content-Type", /javascript/)
    //         .expect(200).end(done);
    // });

    it("should return a 404 on a missing file", (done) => {
        const curPort = nextPort() - 1;
        const req = request(`http://localhost:${curPort}`);

        req.get("/missing").expect(404, "Not Found\n").end(done);
    });
});
