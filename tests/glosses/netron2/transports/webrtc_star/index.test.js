const wrtc = require("wrtc");
const electronWebRTC = require("electron-webrtc");

const {
    netron2: { transport: { WebRTCStar } }
} = adone;

let firstRun = true;
let sigS;

before((done) => {
    const options = {
        port: 15555,
        host: "127.0.0.1",
        metrics: firstRun
    };

    if (firstRun) {
        firstRun = false;
    }

    WebRTCStar.sigServer.start(options, (err, server) => {
        if (err) {
            throw err;
        }

        sigS = server;
        console.log("signalling on:", server.info.uri);
        done();
    });
});

after((done) => {
    sigS.stop(done);
});

describe("transport: with wrtc", () => {
    const create = () => {
        return new WebRTCStar({ wrtc });
    };

    require("./transport/dial.js")(create);
    require("./transport/listen.js")(create);
    require("./transport/discovery.js")(create);
    require("./transport/filter.js")(create);
    require("./transport/valid-connection.js")(create);
    require("./transport/reconnect.node.js")(create);
});

describe("transport: with electron-wrtc", () => {
    const create = () => {
        return new WebRTCStar({ wrtc: electronWebRTC() });
    };

    require("./transport/dial.js")(create);
    require("./transport/listen.js")(create);
    require("./transport/discovery.js")(create);
    require("./transport/filter.js")(create);
    require("./transport/valid-connection.js")(create);
    // TODO ensure that nodes from wrtc close properly (race issue in travis)
    // require('./transport/reconnect.node.js')(create)
});
