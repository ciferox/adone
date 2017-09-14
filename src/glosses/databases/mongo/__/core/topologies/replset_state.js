const {
    database: { mongo },
    event: { EventEmitter },
    is, util
} = adone;
const {
    core: {
        MongoError,
        ReadPreference,
        helper
    }
} = adone.private(mongo);

const TopologyType = {
    Single: "Single",
    ReplicaSetNoPrimary: "ReplicaSetNoPrimary",
    ReplicaSetWithPrimary: "ReplicaSetWithPrimary",
    Sharded: "Sharded",
    Unknown: "Unknown"
};

const ServerType = {
    Standalone: "Standalone",
    Mongos: "Mongos",
    PossiblePrimary: "PossiblePrimary",
    RSPrimary: "RSPrimary",
    RSSecondary: "RSSecondary",
    RSArbiter: "RSArbiter",
    RSOther: "RSOther",
    RSGhost: "RSGhost",
    Unknown: "Unknown"
};

// Filter serves by tags
const filterByTags = (readPreference, servers) => {
    if (is.nil(readPreference.tags)) {
        return servers;
    }
    const filteredServers = [];
    const tagsArray = util.arrify(readPreference.tags);

    // Iterate over the tags
    for (const tags of tagsArray) {
        // Iterate over all the servers
        for (const server of servers) {
            const serverTag = server.lastIsMaster().tags || {};

            // Did we find the a matching server
            let found = true;
            // Check if the server is valid
            for (const name in tags) {
                if (serverTag[name] !== tags[name]) {
                    found = false;
                }
            }

            // Add to candidate list
            if (found) {
                filteredServers.push(server);
            }
        }
    }

    // Returned filtered servers
    return filteredServers;
};

const pickNearestMaxStalenessSeconds = (self, readPreference) => {
    // Only get primary and secondaries as seeds
    let servers = [];

    // Get the maxStalenessMS
    const maxStalenessMS = readPreference.maxStalenessSeconds * 1000;

    // Check if the maxStalenessMS > 90 seconds
    if (maxStalenessMS < 90 * 1000) {
        return new MongoError("maxStalenessSeconds must be set to at least 90 seconds");
    }

    // Add primary to list if not a secondary read preference
    if (self.primary && readPreference.preference !== "secondary" && readPreference.preference !== "secondaryPreferred") {
        servers.push(self.primary);
    }

    // Add all the secondaries
    for (const s of self.secondaries) {
        servers.push(s);
    }

    // Filter by tags
    servers = filterByTags(readPreference, servers);

    //
    // Locate lowest time (picked servers are lowest time + acceptable Latency margin)
    // var lowest = servers.length > 0 ? servers[0].lastIsMasterMS : 0;

    // Filter by latency
    servers = servers.filter((s) => s.staleness <= maxStalenessMS);

    // Sort by time
    servers.sort((a, b) => a.lastIsMasterMS > b.lastIsMasterMS);

    // No servers, default to primary
    if (servers.length === 0) {
        return null;
    }

    // Ensure index does not overflow the number of available servers
    self.index = self.index % servers.length;

    // Get the server
    const server = servers[self.index];
    // Add to the index
    self.index = self.index + 1;
    // Return the first server of the sorted and filtered list
    return server;
};

const pickNearest = (self, readPreference) => {
    // Only get primary and secondaries as seeds
    let servers = [];

    // Add primary to list if not a secondary read preference
    if (self.primary && readPreference.preference !== "secondary" && readPreference.preference !== "secondaryPreferred") {
        servers.push(self.primary);
    }

    // Add all the secondaries
    for (const s of self.secondaries) {
        servers.push(s);
    }

    // If we have a secondaryPreferred readPreference and no server add the primary
    if (servers.length === 0 && self.primary && readPreference.preference !== "secondaryPreferred") {
        servers.push(self.primary);
    }

    // Filter by tags
    servers = filterByTags(readPreference, servers);

    // Sort by time
    servers.sort((a, b) => a.lastIsMasterMS > b.lastIsMasterMS);

    // Locate lowest time (picked servers are lowest time + acceptable Latency margin)
    const lowest = servers.length > 0 ? servers[0].lastIsMasterMS : 0;

    // Filter by latency
    servers = servers.filter((s) => s.lastIsMasterMS <= lowest + self.acceptableLatency);

    // No servers, default to primary
    if (servers.length === 0) {
        return null;
    }

    // Ensure index does not overflow the number of available servers
    self.index = self.index % servers.length;
    // Get the server
    const server = servers[self.index];
    // Add to the index
    self.index = self.index + 1;
    // Return the first server of the sorted and filtered list
    return server;
};

const inList = (ismaster, server, list) => {
    for (const s of list) {
        if (s && s.name && s.name.toLowerCase() === server.name.toLowerCase()) {
            return true;
        }
    }

    return false;
};

const addToList = (self, type, ismaster, server, list) => {
    const serverName = server.name.toLowerCase();
    // Update set information about the server instance
    self.set[serverName].type = type;
    self.set[serverName].electionId = ismaster ? ismaster.electionId : ismaster;
    self.set[serverName].setName = ismaster ? ismaster.setName : ismaster;
    self.set[serverName].setVersion = ismaster ? ismaster.setVersion : ismaster;
    // Add to the list
    list.push(server);
};

const compareObjectIds = (id1, id2) => {
    const a = Buffer.from(id1.toHexString(), "hex");
    const b = Buffer.from(id2.toHexString(), "hex");

    if (a === b) {
        return 0;
    }

    return Buffer.compare(a, b);
};

const removeFrom = (server, list) => {
    for (let i = 0; i < list.length; i++) {
        if (list[i].equals && list[i].equals(server)) {
            list.splice(i, 1);
            return true;
        } else if (is.string(list[i]) && list[i].toLowerCase() === server.name.toLowerCase()) {
            list.splice(i, 1);
            return true;
        }
    }

    return false;
};

const emitTopologyDescriptionChanged = (self) => {
    if (self.listeners("topologyDescriptionChanged").length > 0) {
        let topology = "Unknown";
        const setName = self.setName;

        if (self.hasPrimaryAndSecondary()) {
            topology = "ReplicaSetWithPrimary";
        } else if (!self.hasPrimary() && self.hasSecondary()) {
            topology = "ReplicaSetNoPrimary";
        }

        // Generate description
        const description = {
            topologyType: topology,
            setName,
            servers: []
        };

        // Add the primary to the list
        if (self.hasPrimary()) {
            const desc = self.primary.getDescription();
            desc.type = "RSPrimary";
            description.servers.push(desc);
        }

        // Add all the secondaries
        description.servers = description.servers.concat(self.secondaries.map((x) => {
            const description = x.getDescription();
            description.type = "RSSecondary";
            return description;
        }));

        // Add all the arbiters
        description.servers = description.servers.concat(self.arbiters.map((x) => {
            const description = x.getDescription();
            description.type = "RSArbiter";
            return description;
        }));

        // Add all the passives
        description.servers = description.servers.concat(self.passives.map((x) => {
            const description = x.getDescription();
            description.type = "RSSecondary";
            return description;
        }));

        // Get the diff
        const diffResult = helper.diff(self.replicasetDescription, description);

        // Create the result
        const result = {
            topologyId: self.id,
            previousDescription: self.replicasetDescription,
            newDescription: description,
            diff: diffResult
        };

        // Emit the topologyDescription change
        self.emit("topologyDescriptionChanged", result);

        // Set the new description
        self.replicasetDescription = description;
    }
};

export default class ReplSetState extends EventEmitter {
    constructor(options = {}) {
        super();
        // Topology state
        this.topologyType = TopologyType.ReplicaSetNoPrimary;
        this.setName = options.setName;

        // Server set
        this.set = {};

        // Unpacked options
        this.id = options.id;
        this.setName = options.setName;

        // Server selection index
        this.index = 0;
        // Acceptable latency
        this.acceptableLatency = options.acceptableLatency || 15;

        // heartbeatFrequencyMS
        this.heartbeatFrequencyMS = options.heartbeatFrequencyMS || 10000;

        // Server side
        this.primary = null;
        this.secondaries = [];
        this.arbiters = [];
        this.passives = [];
        this.ghosts = [];
        // Current unknown hosts
        this.unknownServers = [];
        // In set status
        this.set = {};
        // Status
        this.maxElectionId = null;
        this.maxSetVersion = 0;
        // Description of the Replicaset
        this.replicasetDescription = {
            topologyType: "Unknown", servers: []
        };
    }

    hasPrimaryAndSecondary() {
        return !is.nil(this.primary) && this.secondaries.length > 0;
    }

    hasPrimaryOrSecondary() {
        return this.hasPrimary() || this.hasSecondary();
    }

    hasPrimary() {
        return !is.nil(this.primary);
    }

    hasSecondary() {
        return this.secondaries.length > 0;
    }

    get(host) {
        const servers = this.allServers();

        for (const s of servers) {
            if (s.name.toLowerCase() === host.toLowerCase()) {
                return s;
            }
        }

        return null;
    }

    allServers(options = {}) {
        let servers = this.primary ? [this.primary] : [];
        servers = servers.concat(this.secondaries);
        if (!options.ignoreArbiters) {
            servers = servers.concat(this.arbiters);
        }
        servers = servers.concat(this.passives);
        return servers;
    }

    destroy(options) {
        // Destroy all sockets
        if (this.primary) {
            this.primary.destroy(options);
        }
        this.secondaries.forEach((x) => {
            x.destroy(options);
        });
        this.arbiters.forEach((x) => {
            x.destroy(options);
        });
        this.passives.forEach((x) => {
            x.destroy(options);
        });
        this.ghosts.forEach((x) => {
            x.destroy(options);
        });
        // Clear out the complete state
        this.secondaries = [];
        this.arbiters = [];
        this.passives = [];
        this.ghosts = [];
        this.unknownServers = [];
        this.set = {};
        this.primary = null;
        // Emit the topology changed
        emitTopologyDescriptionChanged(this);
    }

    remove(server, options = {}) {
        // Get the server name and lowerCase it
        const serverName = server.name.toLowerCase();

        // Only remove if the current server is not connected
        let servers = this.primary ? [this.primary] : [];
        servers = servers.concat(this.secondaries);
        servers = servers.concat(this.arbiters);
        servers = servers.concat(this.passives);

        // Check if it's active and this is just a failed connection attempt
        for (const s of servers) {
            if (!options.force && s.equals(server) && s.isConnected && s.isConnected()) {
                return;
            }
        }

        // If we have it in the set remove it
        if (this.set[serverName]) {
            this.set[serverName].type = ServerType.Unknown;
            this.set[serverName].electionId = null;
            this.set[serverName].setName = null;
            this.set[serverName].setVersion = null;
        }

        // Remove type
        let removeType = null;

        // Remove from any lists
        if (this.primary && this.primary.equals(server)) {
            this.primary = null;
            this.topologyType = TopologyType.ReplicaSetNoPrimary;
            removeType = "primary";
        }

        // Remove from any other server lists
        removeType = removeFrom(server, this.secondaries) ? "secondary" : removeType;
        removeType = removeFrom(server, this.arbiters) ? "arbiter" : removeType;
        removeType = removeFrom(server, this.passives) ? "secondary" : removeType;
        removeFrom(server, this.ghosts);
        removeFrom(server, this.unknownServers);

        // Push to unknownServers
        this.unknownServers.push(serverName);

        // Do we have a removeType
        if (removeType) {
            this.emit("left", removeType, server);
        }
    }

    update(server) {
        // Get the current ismaster
        const ismaster = server.lastIsMaster();

        // Get the server name and lowerCase it
        const serverName = server.name.toLowerCase();

        // Add any hosts
        if (ismaster) {
            // Join all the possible new hosts
            let hosts = is.array(ismaster.hosts) ? ismaster.hosts : [];
            hosts = hosts.concat(is.array(ismaster.arbiters) ? ismaster.arbiters : []);
            hosts = hosts.concat(is.array(ismaster.passives) ? ismaster.passives : []);
            hosts = hosts.map((s) => s.toLowerCase());
            // Add all hosts as unknownServers
            for (const h of hosts) {
                // Add to the list of unknown server
                if (
                    !this.unknownServers.includes(h) &&
                    (!this.set[h] || this.set[h].type === ServerType.Unknown)
                ) {
                    this.unknownServers.push(h.toLowerCase());
                }

                if (!this.set[h]) {
                    this.set[h] = {
                        type: ServerType.Unknown,
                        electionId: null,
                        setName: null,
                        setVersion: null
                    };
                }
            }
        }

        // Unknown server
        if (!ismaster && !inList(ismaster, server, this.unknownServers)) {
            this.set[serverName] = {
                type: ServerType.Unknown,
                setVersion: null,
                electionId: null,
                setName: null
            };
            // Update set information about the server instance
            this.set[serverName].type = ServerType.Unknown;
            this.set[serverName].electionId = ismaster ? ismaster.electionId : ismaster;
            this.set[serverName].setName = ismaster ? ismaster.setName : ismaster;
            this.set[serverName].setVersion = ismaster ? ismaster.setVersion : ismaster;

            if (!this.unknownServers.includes(server.name)) {
                this.unknownServers.push(serverName);
            }

            // Set the topology
            return false;
        }


        // Is this a mongos
        if (ismaster && ismaster.msg === "isdbgrid") {
            return false;
        }

        // A RSOther instance
        if (
            (ismaster.setName && ismaster.hidden) ||
            (
                ismaster.setName &&
                !ismaster.ismaster &&
                !ismaster.secondary &&
                !ismaster.arbiterOnly &&
                !ismaster.passive
            )
        ) {
            this.set[serverName] = {
                type: ServerType.RSOther,
                setVersion: null,
                electionId: null,
                setName: ismaster.setName
            };
            // Set the topology
            this.topologyType = this.primary
                ? TopologyType.ReplicaSetWithPrimary
                : TopologyType.ReplicaSetNoPrimary;
            if (ismaster.setName) {
                this.setName = ismaster.setName;
            }
            return false;
        }

        // A RSGhost instance
        if (ismaster.isreplicaset) {
            this.set[serverName] = {
                type: ServerType.RSGhost,
                setVersion: null,
                electionId: null,
                setName: null
            };

            // Set the topology
            this.topologyType = this.primary
                ? TopologyType.ReplicaSetWithPrimary
                : TopologyType.ReplicaSetNoPrimary;
            if (ismaster.setName) {
                this.setName = ismaster.setName;
            }

            // Set the topology
            return false;
        }

        // Standalone server, destroy and return
        if (ismaster && ismaster.ismaster && !ismaster.setName) {
            this.topologyType = this.primary
                ? TopologyType.ReplicaSetWithPrimary
                : TopologyType.Unknown;
            this.remove(server, { force: true });
            return false;
        }

        // Server in maintanance mode
        if (ismaster && !ismaster.ismaster && !ismaster.secondary && !ismaster.arbiterOnly) {
            this.remove(server, { force: true });
            return false;
        }

        // If the .me field does not match the passed in server
        if (ismaster.me && ismaster.me.toLowerCase() !== serverName) {
            // Delete from the set
            delete this.set[serverName];

            // Delete unknown servers
            removeFrom(server, this.unknownServers);

            // Destroy the instance
            server.destroy();

            // Set the type of topology we have
            if (this.primary && !this.primary.equals(server)) {
                this.topologyType = TopologyType.ReplicaSetWithPrimary;
            } else {
                this.topologyType = TopologyType.ReplicaSetNoPrimary;
            }

            //
            // We have a potential primary
            //
            if (!this.primary && ismaster.primary) {
                this.set[ismaster.primary.toLowerCase()] = {
                    type: ServerType.PossiblePrimary,
                    setName: null,
                    electionId: null,
                    setVersion: null
                };
            }

            return false;
        }

        // Primary handling
        if (!this.primary && ismaster.ismaster && ismaster.setName) {
            const ismasterElectionId = server.lastIsMaster().electionId;
            if (this.setName && this.setName !== ismaster.setName) {
                this.topologyType = TopologyType.ReplicaSetNoPrimary;
                return new MongoError(`setName from ismaster does not match provided connection setName [${ismaster.setName}] != [${this.setName}]`);
            }

            if (!this.maxElectionId && ismasterElectionId) {
                this.maxElectionId = ismasterElectionId;
            } else if (this.maxElectionId && ismasterElectionId) {
                const result = compareObjectIds(this.maxElectionId, ismasterElectionId);
                // Get the electionIds
                const ismasterSetVersion = server.lastIsMaster().setVersion;

                if (result === 1) {
                    this.topologyType = TopologyType.ReplicaSetNoPrimary;
                    return false;
                } else if (result === 0 && ismasterSetVersion) {
                    if (ismasterSetVersion < this.maxSetVersion) {
                        this.topologyType = TopologyType.ReplicaSetNoPrimary;
                        return false;
                    }
                }

                this.maxSetVersion = ismasterSetVersion;
                this.maxElectionId = ismasterElectionId;
            }

            // Handle normalization of server names
            const normalizedHosts = ismaster.hosts.map((x) => x.toLowerCase());

            // Validate that the server exists in the host list
            if (normalizedHosts.includes(serverName)) {
                this.primary = server;
                this.set[serverName] = {
                    type: ServerType.RSPrimary,
                    setVersion: ismaster.setVersion,
                    electionId: ismaster.electionId,
                    setName: ismaster.setName
                };

                // Set the topology
                this.topologyType = TopologyType.ReplicaSetWithPrimary;
                if (ismaster.setName) {
                    this.setName = ismaster.setName;
                }
                removeFrom(server, this.unknownServers);
                removeFrom(server, this.secondaries);
                removeFrom(server, this.passives);
                this.emit("joined", "primary", server);
            } else {
                this.topologyType = TopologyType.ReplicaSetNoPrimary;
            }

            emitTopologyDescriptionChanged(this);
            return true;
        } else if (ismaster.ismaster && ismaster.setName) {
            // Get the electionIds
            const currentElectionId = this.set[this.primary.name.toLowerCase()].electionId;
            const currentSetVersion = this.set[this.primary.name.toLowerCase()].setVersion;
            const currentSetName = this.set[this.primary.name.toLowerCase()].setName;
            const ismasterElectionId = server.lastIsMaster().electionId;
            const ismasterSetVersion = server.lastIsMaster().setVersion;
            const ismasterSetName = server.lastIsMaster().setName;

            // Is it the same server instance
            if (this.primary.equals(server) && currentSetName === ismasterSetName) {
                return false;
            }

            // If we do not have the same rs name
            if (currentSetName && currentSetName !== ismasterSetName) {
                if (!this.primary.equals(server)) {
                    this.topologyType = TopologyType.ReplicaSetWithPrimary;
                } else {
                    this.topologyType = TopologyType.ReplicaSetNoPrimary;
                }

                return false;
            }

            // Check if we need to replace the server
            if (currentElectionId && ismasterElectionId) {
                const result = compareObjectIds(currentElectionId, ismasterElectionId);

                if (result === 1) {
                    return false;
                } else if (result === 0 && (currentSetVersion > ismasterSetVersion)) {
                    return false;
                }
            } else if (
                !currentElectionId &&
                ismasterElectionId &&
                ismasterSetVersion &&
                ismasterSetVersion < this.maxSetVersion
            ) {
                return false;
            }

            if (!this.maxElectionId && ismasterElectionId) {
                this.maxElectionId = ismasterElectionId;
            } else if (this.maxElectionId && ismasterElectionId) {
                const result = compareObjectIds(this.maxElectionId, ismasterElectionId);

                if (result === 1) {
                    return false;
                } else if (result === 0 && currentSetVersion && ismasterSetVersion) {
                    if (ismasterSetVersion < this.maxSetVersion) {
                        return false;
                    }
                } else if (ismasterSetVersion < this.maxSetVersion) {
                    return false;
                }

                this.maxElectionId = ismasterElectionId;
                this.maxSetVersion = ismasterSetVersion;
            } else {
                this.maxSetVersion = ismasterSetVersion;
            }

            // Modify the entry to unknown
            this.set[this.primary.name.toLowerCase()] = {
                type: ServerType.Unknown,
                setVersion: null,
                electionId: null,
                setName: null
            };

            // Signal primary left
            this.emit("left", "primary", this.primary);
            // Destroy the instance
            this.primary.destroy();
            // Set the new instance
            this.primary = server;
            // Set the set information
            this.set[serverName] = {
                type: ServerType.RSPrimary,
                setVersion: ismaster.setVersion,
                electionId: ismaster.electionId,
                setName: ismaster.setName
            };

            // Set the topology
            this.topologyType = TopologyType.ReplicaSetWithPrimary;
            if (ismaster.setName) {
                this.setName = ismaster.setName;
            }
            removeFrom(server, this.unknownServers);
            removeFrom(server, this.secondaries);
            removeFrom(server, this.passives);
            this.emit("joined", "primary", server);
            emitTopologyDescriptionChanged(this);
            return true;
        }

        // A possible instance
        if (!this.primary && ismaster.primary) {
            this.set[ismaster.primary.toLowerCase()] = {
                type: ServerType.PossiblePrimary,
                setVersion: null,
                electionId: null,
                setName: null
            };
        }

        // Secondary handling
        if (
            ismaster.secondary &&
            ismaster.setName &&
            !inList(ismaster, server, this.secondaries) &&
            this.setName &&
            this.setName === ismaster.setName
        ) {
            addToList(this, ServerType.RSSecondary, ismaster, server, this.secondaries);
            // Set the topology
            this.topologyType = this.primary
                ? TopologyType.ReplicaSetWithPrimary
                : TopologyType.ReplicaSetNoPrimary;
            if (ismaster.setName) {
                this.setName = ismaster.setName;
            }
            removeFrom(server, this.unknownServers);

            // Remove primary
            if (this.primary && this.primary.name.toLowerCase() === serverName) {
                server.destroy();
                this.primary = null;
                this.emit("left", "primary", server);
            }

            // Emit secondary joined replicaset
            this.emit("joined", "secondary", server);
            emitTopologyDescriptionChanged(this);
            return true;
        }

        // Arbiter handling
        if (
            ismaster.arbiterOnly &&
            ismaster.setName &&
            !inList(ismaster, server, this.arbiters) &&
            this.setName &&
            this.setName === ismaster.setName
        ) {
            addToList(this, ServerType.RSArbiter, ismaster, server, this.arbiters);
            // Set the topology
            this.topologyType = this.primary
                ? TopologyType.ReplicaSetWithPrimary
                : TopologyType.ReplicaSetNoPrimary;
            if (ismaster.setName) {
                this.setName = ismaster.setName;
            }
            removeFrom(server, this.unknownServers);
            this.emit("joined", "arbiter", server);
            emitTopologyDescriptionChanged(this);
            return true;
        }

        // Passive handling
        if (
            ismaster.passive &&
            ismaster.setName &&
            !inList(ismaster, server, this.passives) &&
            this.setName &&
            this.setName === ismaster.setName
        ) {
            addToList(this, ServerType.RSSecondary, ismaster, server, this.passives);
            // Set the topology
            this.topologyType = this.primary
                ? TopologyType.ReplicaSetWithPrimary
                : TopologyType.ReplicaSetNoPrimary;
            if (ismaster.setName) {
                this.setName = ismaster.setName;
            }
            removeFrom(server, this.unknownServers);

            // Remove primary
            if (this.primary && this.primary.name.toLowerCase() === serverName) {
                server.destroy();
                this.primary = null;
                this.emit("left", "primary", server);
            }

            this.emit("joined", "secondary", server);
            emitTopologyDescriptionChanged(this);
            return true;
        }

        // Remove the primary
        if (this.set[serverName] && this.set[serverName].type === ServerType.RSPrimary) {
            this.emit("left", "primary", this.primary);
            this.primary.destroy();
            this.primary = null;
            this.topologyType = TopologyType.ReplicaSetNoPrimary;
            return false;
        }

        this.topologyType = this.primary
            ? TopologyType.ReplicaSetWithPrimary
            : TopologyType.ReplicaSetNoPrimary;
        return false;
    }

    updateServerMaxStaleness(server, haInterval) {
        // Locate the max secondary lastwrite
        let max = 0;
        // Go over all secondaries
        for (const s of this.secondaries) {
            max = Math.max(max, s.lastWriteDate);
        }

        // Perform this servers staleness calculation
        if (
            server.ismaster.maxWireVersion >= 5 &&
            server.ismaster.secondary &&
            this.hasPrimary()
        ) {
            server.staleness = (server.lastUpdateTime - server.lastWriteDate)
                - (this.primary.lastUpdateTime - this.primary.lastWriteDate)
                + haInterval;
        } else if (server.ismaster.maxWireVersion >= 5 && server.ismaster.secondary) {
            server.staleness = max - server.lastWriteDate + haInterval;
        }
    }

    updateSecondariesMaxStaleness(haInterval) {
        for (const s of this.secondaries) {
            this.updateServerMaxStaleness(s, haInterval);
        }
    }

    pickServer(readPreference) {
        // If no read Preference set to primary by default
        readPreference = readPreference || ReadPreference.primary;

        // maxStalenessSeconds is not allowed with a primary read
        if (readPreference.preference === "primary" && !is.nil(readPreference.maxStalenessSeconds)) {
            return new MongoError("primary readPreference incompatible with maxStalenessSeconds");
        }

        // Check if we have any non compatible servers for maxStalenessSeconds
        let allservers = this.primary ? [this.primary] : [];
        allservers = allservers.concat(this.secondaries);

        // Does any of the servers not support the right wire protocol version
        // for maxStalenessSeconds when maxStalenessSeconds specified on readPreference. Then error out
        if (!is.nil(readPreference.maxStalenessSeconds)) {
            for (const s of allservers) {
                if (s.ismaster.maxWireVersion < 5) {
                    return new MongoError("maxStalenessSeconds not supported by at least one of the replicaset members");
                }
            }
        }

        // Do we have the nearest readPreference
        if (readPreference.preference === "nearest" && is.nil(readPreference.maxStalenessSeconds)) {
            return pickNearest(this, readPreference);
        } else if (readPreference.preference === "nearest" && !is.nil(readPreference.maxStalenessSeconds)) {
            return pickNearestMaxStalenessSeconds(this, readPreference);
        }

        // Get all the secondaries
        const secondaries = this.secondaries;

        // Check if we can satisfy and of the basic read Preferences
        if (readPreference.equals(ReadPreference.secondary) && secondaries.length === 0) {
            return new MongoError("no secondary server available");
        }

        if (
            readPreference.equals(ReadPreference.secondaryPreferred) &&
            secondaries.length === 0 &&
            is.nil(this.primary)
        ) {
            return new MongoError("no secondary or primary server available");
        }

        if (readPreference.equals(ReadPreference.primary) && is.nil(this.primary)) {
            return new MongoError("no primary server available");
        }

        // Secondary preferred or just secondaries
        if (
            readPreference.equals(ReadPreference.secondaryPreferred) ||
            readPreference.equals(ReadPreference.secondary)
        ) {
            if (secondaries.length > 0 && is.nil(readPreference.maxStalenessSeconds)) {
                // Pick nearest of any other servers available
                const server = pickNearest(this, readPreference);
                // No server in the window return primary
                if (server) {
                    return server;
                }
            } else if (secondaries.length > 0 && !is.nil(readPreference.maxStalenessSeconds)) {
                // Pick nearest of any other servers available
                const server = pickNearestMaxStalenessSeconds(this, readPreference);
                // No server in the window return primary
                if (server) {
                    return server;
                }
            }

            if (readPreference.equals(ReadPreference.secondaryPreferred)) {
                return this.primary;
            }

            return null;
        }

        // Primary preferred
        if (readPreference.equals(ReadPreference.primaryPreferred)) {
            // We prefer the primary if it's available
            if (this.primary) {
                return this.primary;
            }

            let server = null;

            // Pick a secondary
            if (secondaries.length > 0 && is.nil(readPreference.maxStalenessSeconds)) {
                server = pickNearest(this, readPreference);
            } else if (secondaries.length > 0 && !is.nil(readPreference.maxStalenessSeconds)) {
                server = pickNearestMaxStalenessSeconds(this, readPreference);
            }

            //  Did we find a server
            if (server) {
                return server;
            }
        }

        // Return the primary
        return this.primary;
    }
}
