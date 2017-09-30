const {
    is,
    x,
    net,
    netron: { DEFAULT_PORT, ACTION, STATUS, GenesisNetron, Peer, RemoteStub }
} = adone;

const IP_POLICY_NONE = 0;
const IP_POLICY_ALLOW = 1;
const IP_POLICY_DENY = 2;

// Access object:
// ips - list of ips
// policy - "allow" | "deny" - ips access oplicy
// contexts - list of available context through gate

class Gate {
    constructor(netron, { adapter = null, port = netron.options.defaultPort, host = null, access = null } = {}) {
        this.netron = netron;
        this.ipPolicy = IP_POLICY_NONE;
        this.ips = null;
        this.contexts = null;
        this.server = null;

        [this.port, this.host] = net.util.normalizeAddr(port, host, netron.options.defaultPort);
        this.id = net.util.humanizeAddr(netron.options.protocol, port, host);

        if (is.string(adapter)) {
            if (netron.adapters.has(adapter)) {
                const Adapter = netron.adapters.get(adapter);
                this.server = new Adapter({ id: this.id, port, host });
            } else {
                throw new adone.x.NotSupported(`Unsupported adapter: ${adapter}`);
            }
        }

        if (is.plainObject(access)) {
            // Allowed context

            if (is.array(access.contexts)) {
                this.contexts = access.contexts;
            }

            if (is.array(access.ips)) {
                this.ips = [];
                for (const addr of access.ips) {
                    let ipAddr;
                    if (is.ip4(addr)) {
                        ipAddr = new net.address.IP4(addr).toBigNumber();
                    } else if (is.ip6(addr)) {
                        ipAddr = new net.address.IP6(addr).toBigNumber();
                    } else {
                        throw new x.NotValid(`Address or subnet '${addr}' is not valid`);
                    }

                    this.ips.push(ipAddr);
                }
                if (is.string(access.policy)) {
                    this.ipPolicy = (access.policy === "allow" ? IP_POLICY_ALLOW : (access.policy === "deny" ? IP_POLICY_DENY : IP_POLICY_NONE));
                }

                if (this.ipPolicy === IP_POLICY_ALLOW) {
                    // eslint-disable-next-line
                    this.applyPolicy = new Function("peerIp,ips", `
                        return !ips.findIndex((ipBn) => {
                            return peerIpBn.eq(ipBn);
                        });
                    `);
                } else {
                    // eslint-disable-next-line
                    this.applyPolicy = new Function("peerIpBn,ips", `
                        return ips.findIndex((ipBn) => {
                            return peerIpBn.eq(ipBn);
                        });
                    `);
                }
            }
        }
    }

    bind() {
        if (this.netron.gates.has(this.id)) {
            throw new x.Exists(`Already bound to '${this.id}'`);
        }

        // Add gate to netron gates map
        this.netron.gates.set(this.id, this);

        if (!is.null(this.server)) {
            return this.server.bind(this.netron);
        }

        this.server = new net.Server(this.netron.options);
        this.server.options.id = this.id;

        if (!this.netron.options.refGates) {
            this.server.unref();
        }

        return this.server.bind({ port: this.port, host: this.host });
    }
}

export default class Netron extends GenesisNetron {
    constructor(options = {}, uid) {
        super({
            isSuper: false
        }, uid);
        Object.assign(this.options,
            {
                refGates: true,
                refPeers: true
            },
            options,
            {
                peerFactory: (socket, server) => {
                    const peer = this._createPeer(socket, server);
                    this._emitPeerEvent("peer create", peer);
                    return peer;
                },
                сonnectionHandler: this.onNewConnection.bind(this)
            }
        );

        this._nonauthPeers = [];
        this.gates = new Map();
        this.adapters = new Map();

        this.on("peer online", (peer) => {
            if (!this.options.refPeers) {
                peer.unref();
            }
        });
    }

    registerAdapter(id, AdapterClass) {
        if (this.adapters.has(id)) {
            throw new adone.x.Exists(`Adapter '${id}' already registerd`);
        }
        this.adapters.set(id, AdapterClass);
    }

    disconnect(uid) {
        return super.disconnect(uid).then(() => {
            // disconnect all nonauthorized peers
            const nonauthPromises = [];
            for (const peer of this._nonauthPeers) {
                nonauthPromises.push(peer.disconnect());
            }
            return Promise.all(nonauthPromises);
        });
    }

    async bind(options) {
        if (is.string(options)) {
            return this.bind({ port: options });
        }

        const gate = new Gate(this, options);
        return gate.bind();
    }

    async unbind(options) {
        if (is.nil(options)) {
            for (const gate of this.gates.values()) {
                // eslint-disable-next-line
                await gate.server.unbind();
            }
            this.gates.clear();
        } else if (is.string(options.port) && !options.port.includes("/") && !options.port.endsWith(".sock")) {
            const gate = this.gates.get(options.port);
            if (is.undefined(gate)) {
                throw new x.Unknown(`Unknown gate '${options.port}'`);
            }

            await gate.server.unbind();
            this.gates.delete(options.port);
        } else {
            const [port, host] = net.util.normalizeAddr(options.port, options.host, this.options.defaultPort);
            const addr = net.util.humanizeAddr(this.options.protocol, port, host);
            const gate = this.gates.get(addr);
            if (is.undefined(gate)) {
                throw new x.Unknown(`Unknown gate '${options.port}'`);
            }
            await gate.server.unbind();
            this.gates.delete(addr);
        }
    }

    async onConfirmConnection(peer) {
        return true;
    }

    async onConfirmPeer(peer, packet) {
        return true;
    }

    async onNewConnection(peer) {
        let isConfirmed = true;

        const gate = this.gates.get(peer.options.gateId);
        if (gate.ipPolicy !== IP_POLICY_NONE) {
            const peerAddress = peer.getRemoteAddress().address;
            let peerIpBn;
            if (is.ip4(peerAddress)) {
                peerIpBn = new net.address.IP4(peerAddress).toBigNumber();
            } else if (is.ip6(peerAddress)) {
                peerIpBn = new net.address.IP6(peerAddress).toBigNumber();
            } else {
                throw new x.Unknown(`Unknown address: ${peerAddress}`);
            }
            if (gate.applyPolicy(peerIpBn, gate.ips)) {
                return peer.disconnect();
            }
        }
        isConfirmed = await this.onConfirmConnection(peer);
        if (isConfirmed) {
            peer._setStatus(STATUS.HANDSHAKING);
            this._nonauthPeers.push(peer);
            peer.on("disconnect", () => {
                this._peerDisconnected(peer);
            });
            this._emitPeerEvent("peer connect", peer);
            return true;
        }
        return peer.disconnect();
    }

    onSendHandshake(peer) {
        const data = super.onSendHandshake(peer);
        data.isSuper = this.options.isSuper;

        let allowedContexts = null;

        const gateId = peer.options.gateId;
        if (!is.undefined(gateId)) {
            const gate = this.gates.get(gateId);
            if (is.array(gate.contexts) && gate.contexts.length > 0) {
                allowedContexts = gate.contexts;
            }
        }

        // подготавливаем все определения для зарегистрированных контекстов
        const defs = {};
        let hasContexts = false;
        for (const [name, stub] of this.contexts.entries()) {
            if (is.null(allowedContexts) || allowedContexts.includes(name)) {
                defs[name] = stub.definition;
                hasContexts = true;
            }
        }

        if (hasContexts) {
            data.defs = defs;
        }

        return data;
    }

    async _onReceiveHandshake(peer, packet) {
        const data = packet.data;

        const uid = data.uid;
        if (this.nuidPeerMap.has(uid)) {
            throw new x.Exists(`Peer '${uid}' already connected`);
        }

        const isConfirmed = await this.onConfirmPeer(peer, packet);
        if (isConfirmed) {
            this._onReceiveInitial(peer, data);
            this._removePeerFromNonauthList(peer);
        } else {
            throw new x.InvalidAccess(`Access denied for peer '${peer.uid}' - peer not confirmed`);
        }
    }

    async customProcessPacket(peer, packet) {
        const status = packet.getStatus();
        switch (packet.getAction()) {
            case ACTION.GET: {
                switch (status) {
                    case STATUS.HANDSHAKING: {
                        try {
                            await this._onReceiveHandshake(peer, packet);
                            const p = this.send(peer, 0, packet.streamId, 1, ACTION.SET, this.onSendHandshake(peer));
                            peer._setStatus(STATUS.ONLINE);
                            await p;
                            this._emitPeerEvent("peer online", peer);
                        } catch (err) {
                            peer.disconnect();
                            adone.error(err.message);
                        }
                        return true;
                    }
                }
                break;
            }
            case ACTION.CONTEXT_ATTACH: {
                switch (status) {
                    case STATUS.ONLINE: {
                        if (packet.getImpulse()) {
                            try {
                                const ctxData = packet.data;
                                const iCtx = this._createInterface(ctxData.def, peer.uid);
                                const stub = new RemoteStub(this, iCtx);
                                const defId = this._attachContext(ctxData.id, stub);
                                peer._ownDefIds.push(defId);
                                ctxData.def.$remote = true;
                                ctxData.def.$proxyDef = stub.definition;
                                peer._updateDefinitions({ "": ctxData.def });
                                await this.send(peer, 0, packet.streamId, 1, ACTION.CONTEXT_ATTACH, defId);
                            } catch (err) {
                                adone.error(err);
                            }
                        }
                        break;
                    }
                    default: {
                        adone.error(`${peer.uid} attempts 'attach' action with status ${this.getStatusName(status)}`);
                    }
                }
                return true;
            }
            case ACTION.CONTEXT_DETACH: {
                switch (status) {
                    case STATUS.ONLINE: {
                        if (packet.getImpulse()) {
                            const ctxId = packet.data;
                            try {
                                const defId = this.detachContext(ctxId/*, peer*/);
                                peer._defs.delete(defId);
                                const index = peer._ownDefIds.indexOf(defId);
                                if (index >= 0) {
                                    peer._ownDefIds.splice(index, 1);
                                }
                                await this.send(peer, 0, packet.streamId, 1, ACTION.CONTEXT_DETACH);
                            } catch (err) {
                                adone.error(err);
                                if (err.name !== "IllegalState") {
                                    try {
                                        await this.send(peer, 0, packet.streamId, 1, ACTION.CONTEXT_DETACH, err);
                                    } catch (err) {
                                        adone.error(err);
                                    }
                                }
                            }
                        } else { // reply
                            const awaiter = peer._removeAwaiter(packet.streamId);
                            !is.undefined(awaiter) && awaiter(packet.data);
                        }
                        break;
                    }
                    default: {
                        adone.error(`${peer.uid} attempts 'detach' action with status ${this.getStatusName(status)}`);
                    }
                }
                return true;
            }
        }

        return false;
    }

    _createPeer(socket, server) {
        const peer = new Peer({
            netron: this,
            socket,
            packetHandler: this._processPacket,
            handlerThisArg: this,
            protocol: this.options.protocol,
            retryTimeout: this.options.retryTimeout,
            retryMaxTimeout: this.options.retryMaxTimeout,
            reconnects: this.options.reconnects,
            defaultPort: DEFAULT_PORT,
            responseTimeout: this.options.responseTimeout
        });
        if (!is.undefined(server)) {
            const gateId = server.options.id;
            if (!is.nil(gateId)) {
                peer.options.gateId = gateId;
            }
        }
        return peer;
    }

    _peerDisconnected(peer) {
        this._removePeerFromNonauthList(peer);
        if (this.options.isSuper) {
            // Check strong contextes attached remotely by disconnectered peer and remove them.
            for (const [ctxId, stub] of this.contexts.entries()) {
                if (is.netronRemoteStub(stub) && stub.iInstance.$uid === peer.uid) {
                    this.detachContext(ctxId/*, peer*/);
                }
            }

            // Check weak contexts associated with disconnected peer and remove them.
            for (const stub of this._stubs.values()) {
                if (is.netronRemoteStub(stub) && stub.iInstance.$uid === peer.uid) {
                    // this._removePeersRelatedDefinitions(peer, stub.definition);
                    const defId = stub.definition.id;
                    this._stubs.delete(defId);

                    this._releaseOriginatedContexts(defId);
                }
            }
        }
        return super._peerDisconnected(peer);
    }

    refGates() {
        for (const { server } of this.gates.values()) {
            server.ref();
        }
    }

    unrefGates() {
        for (const { server } of this.gates.values()) {
            server.unref();
        }
    }

    refPeers() {
        this.options.refPeers = true;
        for (const peer of this.getPeers().values()) {
            peer.ref();
        }
    }

    unrefPeers() {
        this.options.refPeers = false;
        for (const peer of this.getPeers().values()) {
            peer.unref();
        }
    }

    _removePeerFromNonauthList(peer) {
        const index = this._nonauthPeers.indexOf(peer);
        if (index >= 0) {
            this._nonauthPeers.splice(index, 1);
        }
    }
}
adone.tag.add(Netron, "NETRON");
