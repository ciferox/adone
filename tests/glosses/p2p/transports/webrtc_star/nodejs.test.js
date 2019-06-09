const {
    p2p: { transport: { WebRTCStar } }
} = adone;

describe("p2p", "transport", "WebRTCStar", () => {
    require("./sig_server.js");

    describe("with wrtc", () => {
        const wrtc = require("wrtc");

        const create = () => {
            return new WebRTCStar({ wrtc });
        };

        require("./transport/dial.js")(create);
        require("./transport/listen.js")(create);
        require("./transport/discovery.js")(create);
        require("./transport/filter.js")(create);
        require("./transport/valid_connection.js")(create);
        require("./transport/reconnect.node.js")(create);
    });

    // TODO: Electron-webrtc is currently unreliable on linux
    // describe.skip("with electron-webrtc", () => {
    //     const electronWebRTC = require("electron-webrtc");

    //     const create = () => {
    //         return new WebRTCStar({ wrtc: electronWebRTC() });
    //     };

    //     require("./transport/dial.js")(create);
    //     require("./transport/listen.js")(create);
    //     require("./transport/discovery.js")(create);
    //     require("./transport/filter.js")(create);
    //     require("./transport/valid_connection.js")(create);
    //     // TODO ensure that nodes from wrtc close properly (race issue in travis)
    //     // require('./transport/reconnect.node.js')(create)
    // });
});
