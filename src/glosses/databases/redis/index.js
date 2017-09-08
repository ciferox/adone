const {
    lazify,
    lazifyPrivate
} = adone;

const redis = lazify({
    x: "./x",
    Cluster: "./cluster",
    Redis: "./redis"
}, exports, require);

lazifyPrivate({
    commands: "./__/commands",
    Connector: "./__/connectors/connector",
    SentinelConnector: "./__/connectors/sentinel_connector",
    parser: "./__/redis/parser",
    eventHandler: "./__/redis/event_handler",
    ConnectionPool: "./__/connection_pool",
    DelayQueue: "./__/delay_queue",
    util: "./__/util",
    ScanStream: "./__/scan_stream",
    SubscriptionSet: "./__/subscription_set",
    calculateSlot: "./__/cluster_key_slot",
    Script: "./__/script",
    Pipeline: "./__/pipeline",
    Command: "./__/command",
    Commander: "./__/commander"
}, exports, require);

export const createClient = (...args) => new redis.Redis(...args);
