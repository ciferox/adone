const {
    multiformat: { multiaddr },
    p2p: { transport: { TCP } },
    std: { net }
} = adone;

const sinon = require("sinon");
const tests = require("../interface");

describe("interface-transport compliance", () => {
    tests({
        setup({ upgrader }) {
            const tcp = new TCP({ upgrader });
            const addrs = [
                multiaddr("/ip4/127.0.0.1/tcp/9091"),
                multiaddr("/ip4/127.0.0.1/tcp/9092"),
                multiaddr("/ip4/127.0.0.1/tcp/9093")
            ];

            // Used by the dial tests to simulate a delayed connect
            const connector = {
                delay(delayMs) {
                    const netConnect = net.connect;
                    sinon.replace(net, "connect", (opts) => {
                        const socket = netConnect(opts);
                        const socketEmit = socket.emit.bind(socket);
                        sinon.replace(socket, "emit", (...args) => {
                            const time = args[0] === "connect" ? delayMs : 0;
                            setTimeout(() => socketEmit(...args), time);
                        });
                        return socket;
                    });
                },
                restore() {
                    sinon.restore();
                }
            };

            return { transport: tcp, addrs, connector };
        }
    });
});
