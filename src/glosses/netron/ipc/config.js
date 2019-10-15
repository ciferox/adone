const mergeOptions = require("merge-options");
const { struct, superstruct } = require("superstruct");
const { optional, list } = struct;

const DefaultConfig = {
    connectionManager: {
        minPeers: 25
    },
    config: {
    }
};

// Define custom types
const s = superstruct({
    types: {
        transport: (value) => {
            if (value.length === 0) {
                return "ERROR_EMPTY";
            }
            value.forEach((i) => {
                if (!i.dial) {
                    return "ERR_NOT_A_TRANSPORT";
                }
            });
            return true;
        }
    }
});

const modulesSchema = s({
    // this is hacky to simulate optional because interface doesnt work correctly with it
    // change to optional when fixed upstream
    streamMuxer: optional(list([s("object|function")])),
    transport: "transport"
});

const configSchema = s({
});

const optionsSchema = s({
    switch: "object?",
    connectionManager: "object?",
    peerInfo: "object",
    peerBook: "object?",
    modules: modulesSchema,
    config: configSchema
});

module.exports.validate = (opts) => {
    opts = mergeOptions(DefaultConfig, opts);
    const [error, options] = optionsSchema.validate(opts);

    // Improve errors throwed, reduce stack by throwing here and add reason to the message
    if (error) {
        throw new Error(`${error.message}${error.reason ? ` - ${error.reason}` : ""}`);
    }

    return options;
};
