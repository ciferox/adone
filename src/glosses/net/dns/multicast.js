const {
    is,
    event,
    net: { dns: { packet } },
    std: { os, dgram },
    noop
} = adone;

// inlined from util so this works in the browser
const isError = (err) => Object.prototype.toString.call(err) === "[object Error]";

const apply = (callback, args) => {
    callback.apply(null, args);
};

const nextTickArgs = (fn, a, b) => {
    process.nextTick(() => {
        fn(a, b);
    });
};

let nextTick = nextTickArgs;

const upgrade = (val) => {
    if (val === 42) {
        nextTick = process.nextTick;
    }
};

process.nextTick(upgrade, 42); // pass 42 and see if upgrade is called with it

const thunky = function (fn) {
    let state;
    const thunk = (callback) => {
        state(callback || adone.noop);
    };

    const run = (callback) => {
        const stack = [callback];

        const wait = (callback) => {
            stack.push(callback);
        };

        const done = function (err) {
            const args = arguments;
            const finished = (callback) => {
                nextTick(apply, callback, args);
            };
            state = isError(err) ? run : finished;
            while (stack.length) {
                finished(stack.shift());
            }
        };
        state = wait;
        fn(done);
    };

    state = run;

    return thunk;
};

const defaultInterface = function () {
    const networks = os.networkInterfaces();
    const names = Object.keys(networks);

    for (let i = 0; i < names.length; i++) {
        const net = networks[names[i]];
        for (let j = 0; j < net.length; j++) {
            const iface = net[j];
            if (iface.family === "IPv4" && !iface.internal) {
                return iface.address;
            }
        }
    }

    return "127.0.0.1";
};

const allInterfaces = function () {
    const networks = os.networkInterfaces();
    const names = Object.keys(networks);
    const res = [];

    for (let i = 0; i < names.length; i++) {
        const net = networks[names[i]];
        for (let j = 0; j < net.length; j++) {
            const iface = net[j];
            if (iface.family === "IPv4") {
                res.push(iface.address);
                // could only addMembership once per interface (https://nodejs.org/api/dgram.html#dgram_socket_addmembership_multicastaddress_multicastinterface)
                break;
            }
        }
    }

    return res;
};

export default function (opts) {
    if (!opts) {
        opts = {};
    }

    const that = new event.Emitter();
    let port = is.number(opts.port) ? opts.port : 5353;
    const type = opts.type || "udp4";
    const ip = opts.ip || opts.host || (type === "udp4" ? "224.0.0.251" : null);
    const me = { address: ip, port };
    const memberships = {};
    let destroyed = false;
    let interval = null;

    if (type === "udp6" && (!ip || !opts.interface)) {
        throw new Error("For IPv6 multicast you must specify `ip` and `interface`");
    }

    const socket = opts.socket || dgram.createSocket({
        type,
        reuseAddr: opts.reuseAddr !== false,
        toString() {
            return type;
        }
    });

    socket.on("error", (err) => {
        if (err.code === "EACCES" || err.code === "EADDRINUSE") {
            that.emit("error", err);
        } else {
            that.emit("warning", err);
        }
    });

    socket.on("message", (message, rinfo) => {
        try {
            message = packet.decode(message);
        } catch (err) {
            that.emit("warning", err);
            return;
        }

        that.emit("packet", message, rinfo);

        if (message.type === "query") {
            that.emit("query", message, rinfo);
        }
        if (message.type === "response") {
            that.emit("response", message, rinfo);
        }
    });

    socket.on("listening", () => {
        if (!port) {
            port = me.port = socket.address().port;
        }
        if (opts.multicast !== false) {
            that.update();
            interval = setInterval(that.update, 5000);
            socket.setMulticastTTL(opts.ttl || 255);
            socket.setMulticastLoopback(opts.loopback !== false);
        }
    });

    const bind = thunky((cb) => {
        if (!port) {
            return cb(null);
        }
        socket.once("error", cb);
        socket.bind(port, opts.interface, () => {
            socket.removeListener("error", cb);
            cb(null);
        });
    });

    bind((err) => {
        if (err) {
            return that.emit("error", err);
        }
        that.emit("ready");
    });

    that.send = function (value, rinfo, cb) {
        if (is.function(rinfo)) {
            return that.send(value, null, rinfo);
        }
        if (!cb) {
            cb = noop;
        }
        if (!rinfo) {
            rinfo = me;
        }

        const onbind = function (err) {
            if (destroyed) {
                return cb();
            }
            if (err) {
                return cb(err);
            }
            const message = packet.encode(value);
            socket.send(message, 0, message.length, rinfo.port, rinfo.address || rinfo.host, cb);
        };

        bind(onbind);
    };

    that.response = that.respond = function (res, rinfo, cb) {
        if (is.array(res)) {
            res = { answers: res };
        }

        res.type = "response";
        that.send(res, rinfo, cb);
    };

    that.query = function (q, type, rinfo, cb) {
        if (is.function(type)) {
            return that.query(q, null, null, type);
        }
        if (typeof type === "object" && type && type.port) {
            return that.query(q, null, type, rinfo);
        }
        if (is.function(rinfo)) {
            return that.query(q, type, null, rinfo);
        }
        if (!cb) {
            cb = noop;
        }

        if (is.string(q)) {
            q = [{ name: q, type: type || "ANY" }];
        }
        if (is.array(q)) {
            q = { questions: q };
        }

        q.type = "query";
        that.send(q, rinfo, cb);
    };

    that.destroy = function (cb) {
        if (!cb) {
            cb = noop;
        }
        if (destroyed) {
            return process.nextTick(cb);
        }
        destroyed = true;
        clearInterval(interval);
        socket.once("close", cb);
        socket.close();
    };

    that.update = function () {
        const ifaces = opts.interface ? [].concat(opts.interface) : allInterfaces();
        let updated = false;

        for (let i = 0; i < ifaces.length; i++) {
            const addr = ifaces[i];

            if (memberships[addr]) {
                continue;
            }
            memberships[addr] = true;
            updated = true;

            try {
                socket.addMembership(ip, addr);
            } catch (err) {
                that.emit("warning", err);
            }
        }

        if (!updated || !socket.setMulticastInterface) {
            return;
        }
        socket.setMulticastInterface(opts.interface || defaultInterface());
    };

    return that;
}
