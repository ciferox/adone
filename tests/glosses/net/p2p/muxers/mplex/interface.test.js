import testInterface from "../interface";

const {
    net: { p2p: { muxer: { mplex } } }
} = adone;

describe("muxer", "mplex", "compliance", () => {
    testInterface({
        setup() {
            return mplex;
        },
        teardown() {
        }
    });
});
