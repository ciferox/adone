import testInterface from "../interface";

const {
    net: { p2p: { multiplex } }
} = adone;

describe("muxer", "multiplex", "compliance", () => {
    testInterface({
        setup() {
            return multiplex;
        },
        teardown() {
        }
    });
});
