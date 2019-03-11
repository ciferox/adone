const {
    is,
    lazify
} = adone;

// export default {
//     ROOT_PATH,

//     //     omnitron: {
//     //         LOGS_PATH: omnitronLogsPath,
//     //         LOGFILE_PATH: join(omnitronLogsPath, "omnitron.log"),
//     //         ERRORLOGFILE_PATH: join(omnitronLogsPath, "omnitron-err.log"),
//     //         PIDFILE_PATH: join(RUNTIME_PATH, "omnitron.pid"),
//     //         VAR_PATH: omnitronVarPath,
//     //         DATA_PATH: omnitronDataPath,
//     //         SERVICES_PATH: join(omnitronVarPath, "services"),
//     //         DB_PATH: join(omnitronVarPath, "db")
//     //     }
//     // };




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
    omnitronService: "OMNITRON_SERVICE"
});

const __ = lazify({
    Service: "./service",
    Omnitron: "./omnitron",
    DB: "./omnitron/db",
    Dispatcher: "./dispatcher",
    dispatcher: () => new __.Dispatcher(),
    LOCAL_PEER_INFO: () => {
        const peerInfo = adone.net.p2p.PeerInfo.create(adone.realm.getRootRealm().identity);
        peerInfo.multiaddrs.add(__.DEFAULT_ADDRESS);
        return peerInfo;
    },
    DEFAULT_ADDRESS: () => is.windows
        ? `//winpipe/\\\\.\\pipe\\${adone.realm.getRootRealm().identity.id}\\omnitron.sock`
        : `//unix${adone.std.path.join(adone.runtime.config.RUNTIME_PATH, "omnitron.sock")}`
}, adone.asNamespace(exports), require);
