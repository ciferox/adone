import testInterface from "../interface";

const {
    multi,
    net: { p2p: { transport: { WS } } }
} = adone;

describe("transport", "ws", "interface", () => {
    testInterface({
        setup() {
            const ws = new WS();
            const addrs = [
                multi.address.create("//ip4/127.0.0.1//tcp/9391//ws"),
                multi.address.create("//ip4/127.0.0.1//tcp/9392//wss"),
                multi.address.create("//dns4/p2p.io//tcp/9392//ws"),
                multi.address.create("//dns4/p2p.io//tcp/9392//wss")
            ];
            return [ws, addrs];
        },
        teardown() {
        }
    });
});
