const {
    is,
    x,
    netron: { DEFAULT_PORT, ACTION, STATUS, GenesisNetron, ws: { Peer } }
} = adone;

export default class Netron extends GenesisNetron {
    getDefinitionByName(ctxId, uid = null) {
        if (is.nil(uid)) {
            throw new x.NotSupported("local contexts not supported");
        } else {
            return this.getPeer(uid).getDefinitionByName(ctxId);
        }
    }

    getInterfaceByName(ctxId, uid = null) {
        if (is.nil(uid)) {
            throw new x.NotSupported("local contexts not supported");
        } else {
            return this.getPeer(uid).getInterfaceByName(ctxId);
        }
    }

    async customProcessPacket(peer, packet) {
        switch (packet.getAction()) {
            case ACTION.CONTEXT_ATTACH: {
                switch (packet.getStatus()) {
                    case STATUS.ONLINE: {
                        if (!packet.getImpulse()) {
                            const awaiter = peer._removeAwaiter(packet.streamId);
                            !is.undefined(awaiter) && awaiter(packet.data);
                        }
                        break;
                    }
                    default: {
                        adone.error(`${peer.uid} attempts 'attach' action with status ${this.getStatusName(peer.getStatus())}`);
                    }
                }
                break;
            }
            case ACTION.CONTEXT_DETACH: {
                switch (packet.getStatus()) {
                    case STATUS.ONLINE: {
                        if (!packet.getImpulse()) {
                            const awaiter = peer._removeAwaiter(packet.streamId);
                            !is.undefined(awaiter) && awaiter(packet.data);
                        }
                        break;
                    }
                    default: {
                        adone.error(`${peer.uid} attempts 'attach' action with status ${this.getStatusName(peer.getStatus())}`);
                    }
                }
                break;
            }
        }
    }

    _createPeer(socket, server) {
        const peer = new Peer({
            netron: this,
            socket,
            packetHandler: this._processPacket,
            handlerThisArg: this,
            protocol: this.options.protocol,
            defaultPort: DEFAULT_PORT,
            responseTimeout: this.options.responseTimeout
        });
        return peer;
    }
}
