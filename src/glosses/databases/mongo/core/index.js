const { lazify } = adone;

const core = lazify({
    MongoError: "./error",
    Connection: "./connection/connection",
    Server: "./topologies/server",
    ReplSet: "./topologies/replset",
    ReplSetState: "./topologies/replset_state",
    Mongos: "./topologies/mongos",
    Cursor: "./cursor",
    ReadPreference: "./topologies/read_preference",
    Query: ["./connection/commands", (x) => x.Query],
    Response: ["./connection/commands", (x) => x.Response],
    KillCursor: ["./connection/commands", (x) => x.KillCursor],
    GetMore: ["./connection/commands", (x) => x.GetMore],
    Pool: "./connection/pool",
    CommandResult: "./connection/command_result",
    helper: "./helpers"
}, exports, require);

core.auth = lazify({
    MongoCR: "./auth/mongocr",
    X509: "./auth/x509",
    Plain: "./auth/plain",
    ScramSHA1: "./auth/scram",
    Session: "./auth/session",
    Schema: "./auth/schema"
}, null, require);

core.wireProtocol = lazify({
    24: "./wireprotocol/2_4_support",
    26: "./wireprotocol/2_6_support",
    32: "./wireprotocol/3_2_support",
    Insert: ["./wireprotocol/commands", (x) => x.Insert],
    Update: ["./wireprotocol/commands", (x) => x.Update],
    Remove: ["./wireprotocol/commands", (x) => x.Remove]
}, null, require);
