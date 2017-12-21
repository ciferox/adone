import testInterface from "../interface";

const {
    multi,
    netron2: { transport: { WS } }
} = adone;

describe("netron2", "transport", "ws", "interface", () => {
    testInterface({
        setup(callback) {
            const ws = new WS();
            const addrs = [
                multi.address.create("/ip4/127.0.0.1/tcp/9091/ws"),
                multi.address.create("/ip4/127.0.0.1/tcp/9092/wss"),
                multi.address.create("/dns4/ipfs.io/tcp/9092/ws"),
                multi.address.create("/dns4/ipfs.io/tcp/9092/wss")
            ];
            callback(null, ws, addrs);
        },
        teardown(callback) {
            callback();
        }
    });
});
