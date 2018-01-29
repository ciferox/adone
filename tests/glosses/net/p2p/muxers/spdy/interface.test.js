import testInterface from "../interface";

const {
    net: { p2p: { spdy } }
} = adone;

describe("muxer", "spdy", "interface", () => {
    testInterface({
        setup() {
            return spdy;
        },
        teardown() {
        }
    });
});
