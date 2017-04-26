const { std: { os }, util, is, database: { mongo: { core: { ReadPreference, MongoError } } } } = adone;

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
