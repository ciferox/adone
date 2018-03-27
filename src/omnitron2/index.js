const {
    is,
    lazify
} = adone;

// Service statuses
export const STATUS = {
    INVALID: "invalid",
    DISABLED: "disabled",
    INACTIVE: "inactive",
    STARTING: "starting",
    ACTIVE: "active",
    STOPPING: "stopping"
};

// Possible statuses
export const STATUSES = [
    STATUS.INVALID,
    STATUS.DISABLED,
    STATUS.INACTIVE,
    STATUS.STARTING,
    STATUS.ACTIVE,
    STATUS.STOPPING
];

adone.definePredicates({
    omnitron2Service: "OMNITRON2_SERVICE"
});

const __ = lazify({
    Configuration: "./configuration",
    Service: "./service",
    Omnitron: "./omnitron",
    DB: "./omnitron/db",
    Dispatcher: "./dispatcher",
    dispatcher: () => new __.Dispatcher(),
    LOCAL_PEER_INFO: () => {
        const peerInfo = adone.net.p2p.PeerInfo.create(adone.runtime.realm.identity);
        peerInfo.multiaddrs.add(__.DEFAULT_ADDRESS);
        return peerInfo;
    },
    DEFAULT_ADDRESS: () => is.windows
        ? `//winpipe/\\\\.\\pipe\\${adone.runtime.realm.identity.id}\\omnitron.sock`
        : `//unix${adone.std.path.join(adone.runtime.realm.config.RUNTIME_PATH, "omnitron.sock")}`
}, adone.asNamespace(exports), require);
