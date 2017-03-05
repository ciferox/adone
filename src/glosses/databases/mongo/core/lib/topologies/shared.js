const os = require("os");
const f = require("util").format;

/**
 * Emit event if it exists
 * @method
 */
function emitSDAMEvent(self, event, description) {
    if (self.listeners(event).length > 0) {
        self.emit(event, description);
    }
}

// Get package.json variable
const nodejsversion = f("Node.js %s, %s", process.version, os.endianness());
const type = os.type();
const name = process.platform;
const architecture = process.arch;
const release = os.release();

function createClientInfo(options) {
  // Build default client information
    const clientInfo = options.clientInfo ? clone(options.clientInfo) : {
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
    if (clientInfo.platform && clientInfo.platform.indexOf("mongodb-core") == -1) {
        clientInfo.platform = f("%s, mongodb-core: %s", clientInfo.platform, "x");
    } else if (!clientInfo.platform) {
        clientInfo.platform = nodejsversion;
    }

  // Do we have an application specific string
    if (options.appname) {
    // Cut at 128 bytes
        const buffer = new Buffer(options.appname);
    // Return the truncated appname
        const appname = buffer.length > 128 ? buffer.slice(0, 128).toString("utf8") : options.appname;
    // Add to the clientInfo
        clientInfo.application = { name: appname };
    }

    return clientInfo;
}

function clone(object) {
    return JSON.parse(JSON.stringify(object));
}

const getPreviousDescription = function(self) {
    if (!self.s.serverDescription) {
        self.s.serverDescription = {
            address: self.name,
            arbiters: [], hosts: [], passives: [], type: "Unknown"
        };
    }

    return self.s.serverDescription;
};

const emitServerDescriptionChanged = function(self, description) {
    if (self.listeners("serverDescriptionChanged").length > 0) {
    // Emit the server description changed events
        self.emit("serverDescriptionChanged", {
            topologyId: self.s.topologyId != -1 ? self.s.topologyId : self.id, address: self.name,
            previousDescription: getPreviousDescription(self),
            newDescription: description
        });

        self.s.serverDescription = description;
    }
};

const getPreviousTopologyDescription = function(self) {
    if (!self.s.topologyDescription) {
        self.s.topologyDescription = {
            topologyType: "Unknown",
            servers: [{
                address: self.name, arbiters: [], hosts: [], passives: [], type: "Unknown"
            }]
        };
    }

    return self.s.topologyDescription;
};

const emitTopologyDescriptionChanged = function(self, description) {
    if (self.listeners("topologyDescriptionChanged").length > 0) {
    // Emit the server description changed events
        self.emit("topologyDescriptionChanged", {
            topologyId: self.s.topologyId != -1 ? self.s.topologyId : self.id, address: self.name,
            previousDescription: getPreviousTopologyDescription(self),
            newDescription: description
        });

        self.s.serverDescription = description;
    }
};

const changedIsMaster = function(self, currentIsmaster, ismaster) {
    const currentType = getTopologyType(self, currentIsmaster);
    const newType = getTopologyType(self, ismaster);
    if (newType != currentType) return true;
    return false;
};

const getTopologyType = function(self, ismaster) {
    if (!ismaster) {
        ismaster = self.ismaster;
    }

    if (!ismaster) return "Unknown";
    if (ismaster.ismaster && !ismaster.hosts) return "Standalone";
    if (ismaster.ismaster && ismaster.msg == "isdbgrid") return "Mongos";
    if (ismaster.ismaster) return "RSPrimary";
    if (ismaster.secondary) return "RSSecondary";
    if (ismaster.arbiterOnly) return "RSArbiter";
    return "Unknown";
};

const inquireServerState = function(self) {
    return function(callback) {
        if (self.s.state == "destroyed") return;
    // Record response time
        const start = new Date().getTime();

    // emitSDAMEvent
        emitSDAMEvent(self, "serverHeartbeatStarted", { connectionId: self.name });

    // Attempt to execute ismaster command
        self.command("admin.$cmd", { ismaster: true },  { monitoring: true }, function(err, r) {
            if (!err) {
        // Legacy event sender
                self.emit("ismaster", r, self);

        // Calculate latencyMS
                var latencyMS = new Date().getTime() - start;

        // Server heart beat event
                emitSDAMEvent(self, "serverHeartbeatSucceeded", { durationMS: latencyMS, reply: r.result, connectionId: self.name });

        // Did the server change
                if (changedIsMaster(self, self.s.ismaster, r.result)) {
          // Emit server description changed if something listening
                  emitServerDescriptionChanged(self, {
                    address: self.name, arbiters: [], hosts: [], passives: [], type: !self.s.inTopology ? "Standalone" : getTopologyType(self)
                });
              }

        // Updat ismaster view
                self.s.ismaster = r.result;

        // Set server response time
                self.s.isMasterLatencyMS = latencyMS;
            } else {
                emitSDAMEvent(self, "serverHeartbeatFailed", { durationMS: latencyMS, failure: err, connectionId: self.name });
            }

      // Peforming an ismaster monitoring callback operation
            if (typeof callback == "function") {
                return callback(err, r);
            }

      // Perform another sweep
            self.s.inquireServerStateTimeout = setTimeout(inquireServerState(self), self.s.haInterval);
        });
    };
};

// Object.assign method or polyfille
const assign = Object.assign ? Object.assign : function assign(target) {
    if (target === undefined || target === null) {
        throw new TypeError("Cannot convert first argument to object");
    }

    const to = Object(target);
    for (let i = 1; i < arguments.length; i++) {
        const nextSource = arguments[i];
        if (nextSource === undefined || nextSource === null) {
            continue;
        }

        const keysArray = Object.keys(Object(nextSource));
        for (let nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
            const nextKey = keysArray[nextIndex];
            const desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
            if (desc !== undefined && desc.enumerable) {
                to[nextKey] = nextSource[nextKey];
            }
        }
    }
    return to;
};

//
// Clone the options
const cloneOptions = function(options) {
    const opts = {};
    for (const name in options) {
        opts[name] = options[name];
    }
    return opts;
};

module.exports.inquireServerState = inquireServerState;
module.exports.getTopologyType = getTopologyType;
module.exports.emitServerDescriptionChanged = emitServerDescriptionChanged;
module.exports.emitTopologyDescriptionChanged = emitTopologyDescriptionChanged;
module.exports.cloneOptions = cloneOptions;
module.exports.assign = assign;
module.exports.createClientInfo = createClientInfo;
module.exports.clone = clone;
