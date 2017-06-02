const { lazify } = adone;

lazify({
    command: "./commands",
    packet: "./packets",
    ConnectionConfig: "./connection_config",
    PacketParser: "./packet_parser",
    auth: "./auth",
    PoolConfig: "./pool_config",
    PoolConnection: "./pool_connection",
    PromisePool: "./promise_pool",
    PromiseConnection: "./promise_connection",
    compileBinaryParser: "./compile_binary_parser",
    compileTextParser: "./compile_text_parser",
    stringParser: "./string_parser",
    helper: "./helpers",
    namedPlaceholders: "./named_placeholders"
}, exports, require);
