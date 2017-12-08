const {
    is,
    std: {
        assert,
        crypto,
        stream: { PassThrough }
    }
} = adone;
const {
    defs,
    connect: { Connection }
} = adone.private(adone.net.amqp);

export const schedule = (is.function(setImmediate)) ? setImmediate : process.nextTick;

export const connectionHandshake = (send, wait) => {
    // kick it off
    send(defs.ConnectionStart,
        { versionMajor: 0,
            versionMinor: 9,
            serverProperties: {},
            mechanisms: Buffer.from("PLAIN"),
            locales: Buffer.from("en_US") });
    return wait(defs.ConnectionStartOk)()
        .then((f) => {
            send(defs.ConnectionTune,
                { channelMax: 0,
                    heartbeat: 0,
                    frameMax: 0 });
        })
        .then(wait(defs.ConnectionTuneOk))
        .then(wait(defs.ConnectionOpen))
        .then((f) => {
            send(defs.ConnectionOpenOk,
                { knownHosts: "" });
        });
};

export const OPEN_OPTS = {
    // start-ok
    clientProperties: {},
    mechanism: "PLAIN",
    response: Buffer.from(["", "guest", "guest"].join(String.fromCharCode(0))),
    locale: "en_US",

    // tune-ok
    channelMax: 0,
    frameMax: 0,
    heartbeat: 0,

    // open
    virtualHost: "/",
    capabilities: "",
    insist: 0
};

// When encoding, you can supply explicitly-typed fields like `{'!':
// int32, 50}`. Most of these do not appear in the decoded values, so
// to compare like-to-like we have to remove them from the input.
export const removeExplicitTypes = (input) => {
    switch (typeof input) {
        case "object":
            if (is.nil(input)) {
                return null;
            }
            if (is.array(input)) {
                const newArr = [];
                for (let i = 0; i < input.length; i++) {
                    newArr[i] = removeExplicitTypes(input[i]);
                }
                return newArr;
            }
            if (is.buffer(input)) {
                return input;
            }
            switch (input["!"]) {
                case "timestamp":
                case "decimal":
                case "float":
                    return input;
                case undefined:
                    var newObj = {};
                    for (const k in input) {
                        newObj[k] = removeExplicitTypes(input[k]);
                    }
                    return newObj;
                default:
                    return input.value;
            }

        default:
            return input;
    }
};

// Asserts that the decoded fields are equal to the original fields,
// or equal to a default where absent in the original. The defaults
// depend on the type of method or properties.
//
// This works slightly different for methods and properties: for
// methods, each field must have a value, so the default is
// substituted for undefined values when encoding; for properties,
// fields may be absent in the encoded value, so a default is
// substituted for missing fields when decoding. The effect is the
// same so far as these tests are concerned.
export const assertEqualModuloDefaults = (original, decodedFields) => {
    const args = defs.info(original.id).args;
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const originalValue = original.fields[arg.name];
        const decodedValue = decodedFields[arg.name];
        try {
            if (is.undefined(originalValue)) {
                // longstr gets special treatment here, since the defaults are
                // given as strings rather than buffers, but the decoded values
                // will be buffers.
                assert.deepEqual((arg.type === "longstr") ?
                    Buffer.from(arg.default) : arg.default,
                decodedValue);
            } else {
                assert.deepEqual(removeExplicitTypes(originalValue), decodedValue);
            }
        } catch (assertionErr) {
            const methodOrProps = defs.info(original.id).name;
            assertionErr.message += ` (frame ${methodOrProps
            } field ${arg.name})`;
            throw assertionErr;
        }
    }
    // %%% TODO make sure there's no surplus fields
    return true;
};

export const randomString = () => {
    const hash = crypto.createHash("sha1");
    hash.update(crypto.randomBytes(64));
    return hash.digest("base64");
};


// Set up a socket pair {client, server}, such that writes to the
// client are readable from the server, and writes to the server are
// readable at the client.
//
//          +---+      +---+
//          | C |      | S |
// --write->| l |----->| e |--read-->
//          | i |      | r |
// <--read--| e |<-----| v |<-write--
//          | n |      | e |
//          | t |      | r |
//          +---+      +---+
//
// I also need to make sure that end called on either socket affects
// the other.

export const socketPair = () => {
    const server = new PassThrough();
    const client = new PassThrough();
    server.write = client.push.bind(client);
    client.write = server.push.bind(server);
    function end(chunk, encoding) {
        if (chunk) {
            this.push(chunk, encoding);
        }
        this.push(null);
    }
    server.end = end.bind(client);
    client.end = end.bind(server);

    return { client, server };
};

export const runServer = (socket, run) => {
    const frames = new Connection(socket);
    // We will be closing the socket without doing a closing handshake,
    // so cheat
    frames.expectSocketClose = true;
    // We also need to create some channel buffers, again a cheat
    frames.freshChannel(null);
    frames.freshChannel(null);
    frames.freshChannel(null);

    function send(id, fields, channel, content) {
        channel = channel || 0;
        if (content) {
            schedule(() => {
                frames.sendMessage(channel, id, fields,
                    defs.BasicProperties, fields,
                    content);
            });
        } else {
            schedule(() => {
                frames.sendMethod(channel, id, fields);
            });
        }
    }

    function wait(method) {
        return function () {
            return new Promise(((resolve, reject) => {
                if (method) {
                    frames.step((e, f) => {
                        if (!is.null(e)) {
                            return reject(e);
                        }
                        if (f.id === method) {
                            resolve(f);
                        } else {
                            reject(new Error(`Expected method: ${method
                            }, got ${f.id}`));
                        }
                    });
                } else {
                    frames.step((e, f) => {
                        if (!is.null(e)) {
                            return reject(e);
                        }
                        resolve(f);
                    });
                }
            }));
        };
    }
    run(send, wait);
    return frames;
};

// Produce a callback that will complete the test successfully
export const succeed = (done) => {
    return function () {
        done();
    };
};

// Produce a callback that will complete the test successfully
// only if the value is an object, it has the specified
// attribute, and its value is equals to the expected value
export const succeedIfAttributeEquals = (attribute, value, done) => {
    return function (object) {
        if (object && !(object instanceof Error) && value === object[attribute]) {
            return done();
        }

        done(new Error(`${attribute} is not equal to ${value}`));
    };
};

// Produce a callback that will fail the test, given either an error
// (to be used as a failure continuation) or any other value (to be
// used as a success continuation when failure is expected)
export const fail = (done) => {
    return function (err) {
        if (err instanceof Error) {
            done(err);
        } else {
            done(new Error(`Expected to fail, instead got ${err.toString()}`));
        }
    };
};

// Create a function that will call done once it's been called itself
// `count` times. If it's called with an error value, it will
// immediately call done with that error value.
export const latch = (count, done) => {
    let awaiting = count;
    let alive = true;
    return function (err) {
        if (err instanceof Error && alive) {
            alive = false;
            done(err);
        } else {
            awaiting--;
            if (awaiting === 0 && alive) {
                alive = false;
                done();
            }
        }
    };
};

// Call a thunk with a continuation that will be called with an error
// if the thunk throws one, or nothing if it runs to completion.
export const completes = (thunk, done) => {
    try {
        thunk();
        done();
    } catch (e) {
        done(e);
    }
};

// Construct a Node.JS-style callback from a success continuation and
// an error continuation
export const kCallback = (k, ek) => {
    return function (err, val) {
        if (is.null(err)) {
            k && k(val);
        } else {
            ek && ek(err);
        }
    };
};

// A noddy way to make tests depend on the node version.
export const versionGreaterThan = (actual, spec) => {

    function int(e) {
        return parseInt(e);
    }

    const version = actual.split(".").map(int);
    const desired = spec.split(".").map(int);
    for (let i = 0; i < desired.length; i++) {
        let a = version[i], b = desired[i];
        if (a != b) {
            return a > b;
        }
    }
    return false;
};

export const nodeify = adone.promise.nodeify;

describe("net", "amqp", "versionGreaterThan", () => {

    it("full spec", () => {
        assert(versionGreaterThan("0.8.26", "0.6.12"));
        assert(versionGreaterThan("0.8.26", "0.8.21"));
    });

    it("partial spec", () => {
        assert(versionGreaterThan("0.9.12", "0.8"));
    });

    it("not greater", () => {
        assert(!versionGreaterThan("0.8.12", "0.8.26"));
        assert(!versionGreaterThan("0.6.2", "0.6.12"));
        assert(!versionGreaterThan("0.8.29", "0.8"));
    });
});
