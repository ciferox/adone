const requireCommands = function () {
    return {
        // Files Regular (not MFS)
        add: require("../files-regular/add"),
        addReadableStream: require("../files-regular/add-readable-stream"),
        addPullStream: require("../files-regular/add-pull-stream"),
        addFromFs: require("../files-regular/add-from-fs"),
        addFromURL: require("../files-regular/add-from-url"),
        addFromStream: require("../files-regular/add"),
        cat: require("../files-regular/cat"),
        catReadableStream: require("../files-regular/cat-readable-stream"),
        catPullStream: require("../files-regular/cat-pull-stream"),
        get: require("../files-regular/get"),
        getReadableStream: require("../files-regular/get-readable-stream"),
        getPullStream: require("../files-regular/get-pull-stream"),
        ls: require("../files-regular/ls"),
        lsReadableStream: require("../files-regular/ls-readable-stream"),
        lsPullStream: require("../files-regular/ls-pull-stream"),

        // Files MFS (Mutable Filesystem)
        files: require("../files-mfs"),

        // Block
        block: require("../block"),
        bitswap: require("../bitswap"),

        // Graph
        dag: require("../dag"),
        object: require("../object"),
        pin: require("../pin"),

        // Network
        bootstrap: require("../bootstrap"),
        dht: require("../dht"),
        name: require("../name"),
        ping: require("../ping"),
        pingReadableStream: require("../ping-readable-stream"),
        pingPullStream: require("../ping-pull-stream"),
        swarm: require("../swarm"),
        pubsub: require("../pubsub"),
        dns: require("../dns"),

        // Miscellaneous
        commands: require("../commands"),
        config: require("../config"),
        diag: require("../diag"),
        id: require("../id"),
        key: require("../key"),
        log: require("../log"),
        mount: require("../mount"),
        refs: require("../refs"),
        repo: require("../repo"),
        stop: require("../stop"),
        shutdown: require("../stop"),
        stats: require("../stats"),
        update: require("../update"),
        version: require("../version"),
        resolve: require("../resolve"),
        // ipfs-http-client instance
        getEndpointConfig: (send, config) => require("../get-endpoint-config")(config)
    };
};

const loadCommands = function (send, config) {
    const files = requireCommands();
    const cmds = {};

    Object.keys(files).forEach((file) => {
        cmds[file] = files[file](send, config);
    });

    return cmds;
};

module.exports = loadCommands;
