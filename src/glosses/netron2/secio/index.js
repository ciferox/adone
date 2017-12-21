const handshake = require("./handshake");
const State = require("./state");

const {
    netron2: { Connection },
    stream: { pull }
} = adone;

module.exports = {
    tag: "/secio/1.0.0",
    encrypt(local, key, insecure, callback) {
        if (!local) {
            throw new Error("no local id provided");
        }

        if (!key) {
            throw new Error("no local private key provided");
        }

        if (!insecure) {
            throw new Error("no insecure stream provided");
        }

        if (!callback) {
            callback = (err) => {
                if (err) {
                    console.error(err);
                }
            };
        }

        const state = new State(local, key, 60 * 1000 * 5, callback);

        pull(
            insecure,
            handshake(state),
            insecure
        );

        return new Connection(state.secure, insecure);
    },
    support: require("./support")
};
