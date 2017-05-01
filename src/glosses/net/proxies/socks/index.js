const STATE_VERSION = 0;
// server
const STATE_ULEN = 1;
const STATE_UNAME = 2;
const STATE_PLEN = 3;
const STATE_PASSWD = 4;
// client
const STATE_STATUS = 5;

// server
const BUF_SUCCESS = new Buffer([0x01, 0x00]);
const BUF_FAILURE = new Buffer([0x01, 0x01]);

adone.lazify({
    Agent: "./agent",
    ServerParser: ["./server", (mod) => mod.Parser],
    Server: "./server",
    ClientParser: ["./client", (mod) => mod.Parser],
    Client: "./client",
    createServer: () => (opts, listener) => new adone.net.proxy.socks.Server(opts, listener),
    createConnection: () => (options, cb) => {
        const client = new adone.net.proxy.socks.Client(options);
        process.nextTick(() => {
            client.connect(options, cb);
        });
        return client;
    },
    consts: () => ({
        CMD: {
            CONNECT: 0x01,
            BIND: 0x02,
            UDP: 0x03
        },
        ATYP: {
            IPv4: 0x01,
            NAME: 0x03,
            IPv6: 0x04
        },
        REP: {
            SUCCESS: 0x00,
            GENFAIL: 0x01,
            DISALLOW: 0x02,
            NETUNREACH: 0x03,
            HOSTUNREACH: 0x04,
            CONNREFUSED: 0x05,
            TTLEXPIRED: 0x06,
            CMDUNSUPP: 0x07,
            ATYPUNSUPP: 0x08
        }
    }),
    auth: () => ({
        None: () => ({
            METHOD: 0x00,
            server: (stream, cb) => {
                cb(true);
            },
            client: (stream, cb) => {
                cb(true);
            }
        }),
        UserPassword: (...args) => {
            let authcb;
            let user;
            let pass;
            let userlen;
            let passlen;

            if (args.length === 1 && typeof args[0] === "function") {
                authcb = args[0];
            } else if (args.length === 2 && typeof args[0] === "string" && typeof args[1] === "string") {
                user = args[0];
                pass = args[1];
                userlen = Buffer.byteLength(user);
                passlen = Buffer.byteLength(pass);
                if (userlen > 255) {
                    throw new Error("Username too long (limited to 255 bytes)");
                } else if (passlen > 255) {
                    throw new Error("Password too long (limited to 255 bytes)");
                }
            } else {
                throw new Error("Wrong arguments");
            }

            return {
                METHOD: 0x02,
                server: (stream, cb) => {
                    let state = STATE_VERSION;
                    let userp = 0;
                    let passp = 0;

                    const onData = (chunk) => {
                        let i = 0;
                        const len = chunk.length;
                        let left;
                        let chunkLeft;
                        let minLen;

                        while (i < len) {
                            switch (state) {
                                /*
                                  +----+------+----------+------+----------+
                                  |VER | ULEN |  UNAME   | PLEN |  PASSWD  |
                                  +----+------+----------+------+----------+
                                  | 1  |  1   | 1 to 255 |  1   | 1 to 255 |
                                  +----+------+----------+------+----------+
                                */
                                case STATE_VERSION:
                                    if (chunk[i] !== 0x01) {
                                        stream.removeListener("data", onData);
                                        cb(new Error(`Unsupported auth request version: ${chunk[i]}`));
                                        return;
                                    }
                                    ++i;
                                    ++state;
                                    break;
                                case STATE_ULEN: {
                                    const ulen = chunk[i];
                                    if (ulen === 0) {
                                        stream.removeListener("data", onData);
                                        cb(new Error("Bad username length (0)"));
                                        return;
                                    }
                                    ++i;
                                    ++state;
                                    user = new Buffer(ulen);
                                    userp = 0;
                                    break;
                                }
                                case STATE_UNAME:
                                    left = user.length - userp;
                                    chunkLeft = len - i;
                                    minLen = (left < chunkLeft ? left : chunkLeft);
                                    chunk.copy(user,
                                        userp,
                                        i,
                                        i + minLen);
                                    userp += minLen;
                                    i += minLen;
                                    if (userp === user.length) {
                                        user = user.toString("utf8");
                                        ++state;
                                    }
                                    break;
                                case STATE_PLEN: {
                                    const plen = chunk[i];
                                    if (plen === 0) {
                                        stream.removeListener("data", onData);
                                        cb(new Error("Bad password length (0)"));
                                        return;
                                    }
                                    ++i;
                                    ++state;
                                    pass = new Buffer(plen);
                                    passp = 0;
                                    break;
                                }
                                case STATE_PASSWD:
                                    left = pass.length - passp;
                                    chunkLeft = len - i;
                                    minLen = (left < chunkLeft ? left : chunkLeft);
                                    chunk.copy(pass,
                                        passp,
                                        i,
                                        i + minLen);
                                    passp += minLen;
                                    i += minLen;
                                    if (passp === pass.length) {
                                        stream.removeListener("data", onData);
                                        pass = pass.toString("utf8");
                                        state = STATE_VERSION;
                                        if (i < len) {
                                            stream.unshift(chunk.slice(i));
                                        }
                                        authcb(user, pass, (success) => {
                                            if (stream.writable) {
                                                if (success) {
                                                    stream.write(BUF_SUCCESS);
                                                } else {
                                                    stream.write(BUF_FAILURE);
                                                }
                                                cb(success);
                                            }
                                        });
                                        return;
                                    }
                                    break;
                                // ===================================================================
                            }
                        }
                    };
                    stream.on("data", onData);
                },
                client: (stream, cb) => {
                    let state = STATE_VERSION;
                    const onData = (chunk) => {
                        let i = 0;
                        const len = chunk.length;

                        while (i < len) {
                            switch (state) {
                                /*
                                  +----+--------+
                                  |VER | STATUS |
                                  +----+--------+
                                  | 1  |   1    |
                                  +----+--------+
                                */
                                case STATE_VERSION:
                                    if (chunk[i] !== 0x01) {
                                        stream.removeListener("data", onData);
                                        cb(new Error(`Unsupported auth request version: ${chunk[i]}`));
                                        return;
                                    }
                                    ++i;
                                    state = STATE_STATUS;
                                    break;
                                case STATE_STATUS: {
                                    const status = chunk[i];
                                    ++i;
                                    state = STATE_VERSION;
                                    if (i < len) {
                                        stream.unshift(chunk.slice(i));
                                    }
                                    stream.removeListener("data", onData);
                                    cb(status === 0);
                                    return;
                                }
                            }
                        }
                    };
                    stream.on("data", onData);

                    const buf = new Buffer(3 + userlen + passlen);
                    buf[0] = 0x01;
                    buf[1] = userlen;
                    buf.write(user, 2, userlen);
                    buf[2 + userlen] = passlen;
                    buf.write(pass, 3 + userlen, passlen);

                    stream.write(buf);
                }
            };
        }
    }),
    ipbytes: () => (str) => {
        const type = adone.std.net.isIP(str);
        let nums;
        let bytes;
        let i;

        if (type === 4) {
            nums = str.split(".", 4);
            bytes = new Array(4);
            for (i = 0; i < 4; ++i) {
                if (isNaN(bytes[i] = Number(nums[i]))) {
                    throw new Error(`Error parsing IP: ${str}`);
                }
            }
        } else if (type === 6) {
            const addr = new adone.net.address.IP6(str);
            let b = 0;
            let group;
            if (!addr.valid) {
                throw new Error(`Error parsing IP: ${str}`);
            }
            nums = addr.parsedAddress;
            bytes = new Array(16);
            for (i = 0; i < 8; ++i, b += 2) {
                group = parseInt(nums[i], 16);
                bytes[b] = group >>> 8;
                bytes[b + 1] = group & 0xFF;
            }
        }

        return bytes;
    }
}, exports, require);
