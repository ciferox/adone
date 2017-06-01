const { lazify } = adone;

lazify({
    commands: "./commands",
    Connector: "./connectors/connector",
    SentinelConnector: "./connectors/sentinel_connector",
    parser: "./redis/parser",
    eventHandler: "./redis/event_handler",
    ConnectionPool: "./connection_pool",
    DelayQueue: "./delay_queue",
    util: "./util",
    ScanStream: "./scan_stream",
    SubscriptionSet: "./subscription_set",
    calculateSlot: "./cluster_key_slot",
    Script: "./script",
    Pipeline: "./pipeline",
    Command: "./command",
    Commander: "./commander"
}, exports, require);
