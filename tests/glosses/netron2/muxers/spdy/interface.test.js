import testInterface from "../interface";

const {
    netron2: { spdy }
} = adone;

describe("netron2", "muxer", "spdy", "interface", () => {
    testInterface({
        setup() {
            return spdy;
        },
        teardown() {
        }
    });
});
