const {
    std: { os },
    util,
    is,
    database: { mongo }
} = adone;
const {
    core: {
        ReadPreference,
        MongoError
    }
} = adone.private(mongo);

export const emitSDAMEvent = (self, event, description) => {
    if (self.listeners(event).length > 0) {
        self.emit(event, description);
    }
};

// Get package.json variable
const nodejsversion = `Node.js ${process.version}, ${os.endianness()}`;
const type = os.type();
const name = process.platform;
const architecture = process.arch;
const release = os.release();

export const createClientInfo = (options) => {
    // Build default client information
    const clientInfo = options.clientInfo ? util.clone(options.clientInfo) : {
        driver: {
            name: "nodejs-core",
            version: "x"
        },
        os: {
            type,
            name,
            architecture,
            version: release
        }
    };

    // Is platform specified
    if (clientInfo.platform && !clientInfo.platform.includes("mongodb-core")) {
        clientInfo.platform = `${clientInfo.platform}, mongodb-core: x`;
    } else if (!clientInfo.platform) {
        clientInfo.platform = nodejsversion;
    }

    // Do we have an application specific string
    if (options.appname) {
        // Cut at 128 bytes
        const buffer = Buffer.from(options.appname);
        // Return the truncated appname
        const appname = buffer.length > 128 ? buffer.slice(0, 128).toString("utf8") : options.appname;
        // Add to the clientInfo
        clientInfo.application = { name: appname };
    }

    return clientInfo;
};

export const getReadPreference = (cmd, options) => {
    // Default to command version of the readPreference
    let readPreference = cmd.readPreference || new ReadPreference("primary");
    // If we have an option readPreference override the command one
    if (options.readPreference) {
        readPreference = options.readPreference;
    }

    if (is.string(readPreference)) {
        readPreference = new ReadPreference(readPreference);
    }

    if (!(readPreference instanceof ReadPreference)) {
        throw new MongoError("readPreference must be a ReadPreference instance");
    }

    return readPreference;
};

export class Interval {
    constructor(fn, time) {
        this.timer = null;
        this.fn = fn;
        this.time = time;
    }

    start() {
        if (!this.isRunning()) {
            this.timer = setInterval(this.fn, this.time);
        }
        return this;
    }

    stop() {
        clearInterval(this.timer);
        this.timer = null;
        return this;
    }

    isRunning() {
        return !is.null(this.timer);
    }
}

export class Timeout {
    constructor(fn, time) {
        this.timer = null;
        this.fn = fn;
        this.time = time;
    }

    start() {
        if (!this.isRunning()) {
            this.timer = setTimeout(this.fn, this.time);
        }
        return this;
    }

    stop() {
        clearTimeout(this.timer);
        this.timer = null;
        return this;
    }

    isRunning() {
        return !is.null(this.timer);
    }
}

export const diff = (previous, current) => {
    // Difference document
    const diff = {
        servers: []
    };

    // Previous entry
    if (!previous) {
        previous = { servers: [] };
    }

    // Check if we have any previous servers missing in the current ones
    for (let i = 0; i < previous.servers.length; i++) {
        let found = false;

        for (let j = 0; j < current.servers.length; j++) {
            if (current.servers[j].address.toLowerCase()
                === previous.servers[i].address.toLowerCase()) {
                found = true;
                break;
            }
        }

        if (!found) {
            // Add to the diff
            diff.servers.push({
                address: previous.servers[i].address,
                from: previous.servers[i].type,
                to: "Unknown"
            });
        }
    }

    // Check if there are any severs that don't exist
    for (let j = 0; j < current.servers.length; j++) {
        let found = false;

        // Go over all the previous servers
        for (let i = 0; i < previous.servers.length; i++) {
            if (previous.servers[i].address.toLowerCase() === current.servers[j].address.toLowerCase()) {
                found = true;
                break;
            }
        }

        // Add the server to the diff
        if (!found) {
            diff.servers.push({
                address: current.servers[j].address,
                from: "Unknown",
                to: current.servers[j].type
            });
        }
    }

    // Got through all the servers
    for (let i = 0; i < previous.servers.length; i++) {
        const prevServer = previous.servers[i];

        // Go through all current servers
        for (let j = 0; j < current.servers.length; j++) {
            const currServer = current.servers[j];

            // Matching server
            if (prevServer.address.toLowerCase() === currServer.address.toLowerCase()) {
                // We had a change in state
                if (prevServer.type !== currServer.type) {
                    diff.servers.push({
                        address: prevServer.address,
                        from: prevServer.type,
                        to: currServer.type
                    });
                }
            }
        }
    }

    // Return difference
    return diff;
};
