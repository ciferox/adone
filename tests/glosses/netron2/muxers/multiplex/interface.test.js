import testInterface from "../interface";

const {
    netron2: { multiplex }
} = adone;

describe("netron2", "muxer", "multiplex", "compliance", () => {
    testInterface({
        setup(cb) {
            cb(null, multiplex);
        },
        teardown(cb) {
            cb();
        }
    });
});
