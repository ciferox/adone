import adone from "adone";  // wtf

const {
    netron: { Netron, decorator: { Contextable } } 
} = adone;

const port = process.argv[2];
const netron = new Netron();
let master = null;
let started = false;

@Contextable
class Container {
    ping() {
        return "pong";
    }

    initiateGracefulShutdown() {
        if (process.platform === "win32") {
            process.emit("SIGINT");  // just imitate the behaviour
        } else {
            process.kill(process.pid, "SIGINT");
        }
    }

    start(path, args = []) {
        process.argv = [process.argv[0], path, ...args];
        master.unref();
        started = true;
        adone.std.module._load(path, null, true);
    }
}

netron.attachContext(new Container(), "container");

netron.on("peer online", (peer) => {
    if (master === null) {
        master = peer;
        netron.unrefGates();
    }
    if (started) {
        peer.unref();
    }
});

netron.on("peer offline", (peer) => {
    if (peer === master) {
        netron.refGates();  // wait for the master
    }
});

async function main() {
    await netron.bind({ port });
}

main().catch((err) => {
    console.error(new Date(), err.stack || err.message || err);
    process.exit(128 + 13);  // Failed to start the container, shouldnt happen
});
