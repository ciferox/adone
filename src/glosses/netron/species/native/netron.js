import adone from "adone";
const { is, x, netron: { DEFAULT_PORT, ACTION, STATUS, PEER_TYPE, GenesisNetron, Peer, RemoteStub } } = adone;

const IP_POLICY_NONE = 0;
const IP_POLICY_ALLOW = 0;
const IP_POLICY_DENY = 0;

export default class Netron extends GenesisNetron {
    constructor(uid = null, options = {}) {
        super(uid, {
            isSuper: false
        });
        this.option.assign({
            refGates: true,
            refPeers: true
        }, options, {
            peerFactory: (socket, gate) => {
                const peer = this._createPeer(socket, gate, PEER_TYPE.ACTIVE);
                this._emitPeerEvent("peer create", peer);
                return peer;
            },
            сonnectionHandler: this.onNewConnection.bind(this)
        });

        this._nonauthPeers = [];
        this._gates = new Map();
        this._adapters = new Map();

        this.on("peer online", (peer) => {
            if (!this.option.refPeers) {
                peer.unref();
            }
        });
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
        if (is.nil(options)) {
            await this._bindSocket({ });
            for (const name of this._adapters.keys()) {
                await this.bind({ port: name });
            }
        } else if (is.string(options)) {
            return this.bind({ port: options });
        } else if (is.object(options)) {
            if (is.string(options.port) && !options.port.includes("/") && !options.port.endsWith(".sock") && !options.port.startsWith("\\\\.\\pipe\\")) {
                const adapter = this._adapters.get(options.port);
                if (is.undefined(adapter)) {
                    throw new x.Unknown(`unknown gate '${options.port}'`);
                }

                if (this._gates.has(options.port)) {
                    throw new x.Exists(`already bound to '${options.port}'`);
                }
                this._setGate(options.port, adapter, adapter.option);
                await adapter.bind(this);
            } else {
                await this._bindSocket(options);
            }
        }
    }

    async unbind(options) {
        if (is.nil(options)) {
            for (const gate of this._gates.values()) {
                await gate.server.unbind();
            }
            this._gates.clear();
        } else if (is.string(options.port) && !options.port.includes("/") && !options.port.endsWith(".sock")) {
            const gate = this._gates.get(options.port);
            if (is.undefined(gate)) {
                throw new x.Unknown(`unknown gate '${options.port}'`);
            }

            await gate.server.unbind();
            this._gates.delete(options.port);
        } else {
            const [port, host] = adone.net.util.normalizeAddr(options.port, options.host, this.option.defaultPort);
            const addr = adone.util.humanizeAddr(this.option.protocol, port, host);
            const gate = this._gates.get(addr);
            if (is.undefined(gate)) {
                throw new x.Unknown(`unknown gate '${options.port}'`);
            }
            await gate.server.unbind();
            this._gates.delete(addr);
        }
    }

    async attachAdapter(adapter) {
        const id = adapter.option.id;
        if (!is.string(id)) {
            throw new x.InvalidArgument("adapter without id");
        }

        if (this._adapters.has(id)) {
            throw new x.Exists(`adapter '${id}' already attached`);
        }

        this._adapters.set(id, adapter);
    }

    async onConfirmConnection(peer) {
        return true;
    }

    async onConfirmPeer(peer, packet) {
        return true;
    }

    async onNewConnection(peer) {
        let isConfirmed = true;
        const gateData = this._gates.get(peer.option.gate_id);
        if (gateData.ipPolicy !== IP_POLICY_NONE) {
            const peerAddress = peer.getRemoteAddress().address;
            let peerIpBn;
            if (is.ip4(peerAddress)) {
                peerIpBn = new adone.net.address.IP4(peerAddress).toBigNumber();
            } else if (is.ip6(peerAddress)) {
                peerIpBn = new adone.net.address.IP6(peerAddress).toBigNumber();
            } else {
                throw new x.Unknown(`unknown address: ${peerAddress}`);
            }
            if (gateData.applyPolicy(peerIpBn, gateData.ipList)) {
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
        } else {
            return peer.disconnect();
        }
    }

    onSendHandshake(peer) {
        const data = super.onSendHandshake(peer);
        data.isSuper = this.option.isSuper;

        let allowedContexts = null;

        const gateId = peer.option.gate_id;
        if (!is.undefined(gateId)) {
            const gate = this._gates.get(gateId);
            const access = gate.option.access;
            if (!is.undefined(access) && is.array(access.contexts)) {
                allowedContexts = access.contexts;
            }
        }

        // подготавливаем все определения для зарегистрированных контекстов
        const defs = adone.o();
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
        const data = packet[GenesisNetron._DATA];

        const uid = data.identity.uid;
        if (this.nuidPeerMap.has(uid)) {
            throw new x.Exists(`peer '${uid}' already connected`);
        }

        const isConfirmed = await this.onConfirmPeer(peer, packet);
        if (isConfirmed) {
            this._onReceiveInitial(peer, data);
            this._removePeerFromNonauthList(peer);
        } else {
            throw new x.InvalidAccess(`access denied for peer '${peer.uid}' - peer not confirmed`);
        }
    }

    async customProcessPacket(peer, flags, action, status, packet) {
        switch (action) {
            case ACTION.GET: {
                switch (status) {
                    case STATUS.HANDSHAKING: {
                        try {
                            await this._onReceiveHandshake(peer, packet);
                            const p = this.send(peer, 0, packet[GenesisNetron._STREAM_ID], 1, ACTION.SET, this.onSendHandshake(peer));
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
                        if (flags.get(GenesisNetron.FLAG_IMPULSE)) {
                            try {
                                const ctxData = packet[GenesisNetron._DATA];
                                const iCtx = this._createInterface(ctxData.def, peer.uid);
                                const stub = new RemoteStub(this, iCtx);
                                const defId = this._attachContext(ctxData.id, stub);
                                peer._ownDefIds.push(defId);
                                ctxData.def.$remote = true;
                                ctxData.def.$proxyDef = stub.definition;
                                peer._updateDefinitions({ "": ctxData.def });
                                await this.send(peer, 0, packet[GenesisNetron._STREAM_ID], 1, ACTION.CONTEXT_ATTACH, defId);
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
                        if (flags.get(GenesisNetron.FLAG_IMPULSE)) {
                            const ctxId = packet[GenesisNetron._DATA];
                            try {
                                const defId = this.detachContext(ctxId/*, peer*/);
                                peer._defs.delete(defId);
                                const index = peer._ownDefIds.indexOf(defId);
                                if (index >= 0) {
                                    peer._ownDefIds.splice(index, 1);
                                }
                                await this.send(peer, 0, packet[GenesisNetron._STREAM_ID], 1, ACTION.CONTEXT_DETACH);
                            } catch (err) {
                                adone.error(err);
                                if (err.name !== "IllegalState") {
                                    try {
                                        await this.send(peer, 0, packet[GenesisNetron._STREAM_ID], 1, ACTION.CONTEXT_DETACH, err);
                                    } catch (err) {
                                        adone.error(err);
                                    }
                                }
                            }
                        } else { // reply
                            const awaiter = peer._removeAwaiter(packet[GenesisNetron._STREAM_ID]);
                            !is.undefined(awaiter) && awaiter(packet[GenesisNetron._DATA]);
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

    _createPeer(socket, gate, peerType = PEER_TYPE.PASSIVE) {
        const peer = new Peer({
            netron: this,
            socket,
            packetHandler: this._processPacket,
            handlerThisArg: this,
            protocol: this.option.protocol,
            retryTimeout: this.option.retryTimeout,
            retryMaxTimeout: this.option.retryMaxTimeout,
            reconnects: this.option.reconnects,
            defaultPort: DEFAULT_PORT,
            responseTimeout: this.option.responseTimeout
        });
        if (!is.undefined(gate)) {
            const gateId = gate.option.get("id");
            if (!is.undefined(gateId)) {
                peer.option.gate_id = gateId;
            }
        }
        peer._type = peerType;
        return peer;
    }

    _peerDisconnected(peer) {
        this._removePeerFromNonauthList(peer);
        if (this.option.isSuper) {
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

    async _bindSocket(options) {
        let id = options.id;
        if (is.undefined(id)) {
            [options.port, options.host] = adone.net.util.normalizeAddr(options.port, options.host, this.option.defaultPort);
            id = adone.util.humanizeAddr(this.option.protocol, options.port, options.host);
        }
        if (this._gates.has(id)) {
            throw new x.Exists(`already bound to '${id}'`);
        }

        const server = new adone.net.Server(this.option);
        this._setGate(id, server, options);
        if (!this.option.refGates) {
            server.unref();
        }
        await server.bind(options);
    }

    _setGate(id, server, options) {
        const gateData = adone.o({
            server,
            option: options
        });

        if (is.undefined(server.option.id)) {
            server.option.id = id;
        }

        gateData.ipPolicy = IP_POLICY_NONE;
        if (is.propertyDefined(options, "access")) {
            const ipList = options.access.ip_list;
            if (!is.undefined(ipList)) {
                gateData.ipList = [];
                for (const addr of ipList) {
                    let ipAddr;
                    if (is.ip4(addr)) {
                        ipAddr = new adone.net.address.IP4(addr).toBigNumber();
                    } else if (is.ip6(addr)) {
                        ipAddr = new adone.net.address.IP6(addr).toBigNumber();
                    } else {
                        throw new x.NotValid(`address or subnet '${addr}' is not valid`);
                    }

                    gateData.ipList.push(ipAddr);
                }
                if (gateData.deny && gateData.deny.length > 0) {
                    const ipPolicy = is.string(options.access.ip_policy) ? options.access.ip_policy : "";
                    gateData.ipPolicy = (ipPolicy === "allow" ? IP_POLICY_ALLOW : (ipPolicy === "deny" ? IP_POLICY_DENY : IP_POLICY_NONE));
                }
                if (gateData.deny && gateData.deny.length === 0 || gateData.ipPolicy === IP_POLICY_NONE) {
                    delete gateData.ipList;
                } else {
                    if (gateData.ipPolicy === IP_POLICY_ALLOW) {
                        gateData.applyPolicy = new Function("peerIp,ipList", `
                            return !ipList.findIndex((ipBn) => {
                                return peerIpBn.eq(ipBn);
                            });
                        `);
                    } else {
                        gateData.applyPolicy = new Function("peerIpBn,ipList", `
                            return ipList.findIndex((ipBn) => {
                                return peerIpBn.eq(ipBn);
                            });
                        `);
                    }
                }
            }
        }
        this._gates.set(id, gateData);
    }

    refGates() {
        for (const { server } of this._gates.values()) {
            server.ref();
        }
    }

    unrefGates() {
        for (const { server } of this._gates.values()) {
            server.unref();
        }
    }

    refPeers() {
        this.option.refPeers = true;
        for (const peer of this.getPeers().values()) {
            peer.ref();
        }
    }

    unrefPeers() {
        this.option.refPeers = false;
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
adone.tag.set(Netron, adone.tag.NETRON);
