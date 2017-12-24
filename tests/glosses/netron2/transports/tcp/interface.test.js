import testInterface from "../interface";

const {
    netron2: { transport: { TCP } },
    multi
} = adone;

describe("netron2", "transports", "tcp", "interface", () => {
    testInterface({
        setup(cb) {
            const tcp = new TCP();
            const addrs = [
                multi.address.create("/ip4/127.0.0.1/tcp/9491"),
                multi.address.create("/ip4/127.0.0.1/tcp/9492"),
                multi.address.create("/ip4/127.0.0.1/tcp/9493")
            ];
            cb(null, tcp, addrs);
        },
        teardown(cb) {
            cb();
        }
    });
});
