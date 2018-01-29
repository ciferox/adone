import testInterface from "../interface";

const {
    net: { p2p: { transport: { TCP } } },
    multi
} = adone;

describe("transport", "tcp", "interface", () => {
    testInterface({
        setup() {
            const tcp = new TCP();
            const addrs = [
                multi.address.create("/ip4/127.0.0.1/tcp/9491"),
                multi.address.create("/ip4/127.0.0.1/tcp/9492"),
                multi.address.create("/ip4/127.0.0.1/tcp/9493")
            ];
            return [tcp, addrs];
        },
        teardown() {
        }
    });
});
