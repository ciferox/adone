import adone from "adone";
const { is, x } = adone;
const { DEFAULT_PORT, ACTION, STATUS, PEER_TYPE, GenesisNetron } = adone.netron;
const { Peer } = adone.netron.ws;

/**
 * Реализация нетрона на базе WebSocket-а.
 * 
 * Данный нетрон может использоваться только для подключения к другим нетронам, но сам не является 'серверным' (не поддерживает bind()/unbind()).
 * 
 * @export
 * @class WebNetron
 */
export default class WebSocketNetron extends GenesisNetron {
    constructor(options) {
        super(options);
    }

    /**
     * Возвращает определение для указанного контекста и NUId
     *
     * @param {String} идентификатор контекста, зарегистрированного в netron-е
     * @param {String} идентификатор netron-а на стороне которого находится контекст
     * @returns {Definition}
     *
     * @memberOf Netron
     */
    getDefinitionByName(ctxId, uid = null) {
        if (is.nil(uid)) {
            throw new x.NotSupported("local contexts not supported");
        } else {
            return this.getPeer(uid).getDefinitionByName(ctxId);
        }
    }

    /**
     * Возвращает интерфейс для указанного контекста и NUId.
     *
     * @param {String} идентификатор контекста, зарегистрированного в netron-е
     * @param {String} идентификатор netron-а на стороне которого находится контекст
     * @returns {Interface}
     *
     * @memberOf Netron
     */
    getInterfaceByName(ctxId, uid = null) {
        if (is.nil(uid)) {
            throw new x.NotSupported("local contexts not supported");
        } else {
            return this.getPeer(uid).getInterfaceByName(ctxId);
        }
    }

    async customProcessPacket(peer, flags, action, status, packet) {
        switch (action) {
            case ACTION.CONTEXT_ATTACH: {
                switch (status) {
                    case STATUS.ONLINE: {
                        if (!flags.get(GenesisNetron.FLAG_IMPULSE)) {
                            const awaiter = peer._removeAwaiter(packet[GenesisNetron._STREAM_ID]);
                            !is.undefined(awaiter) && awaiter(packet[GenesisNetron._DATA]);
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
                switch (status) {
                    case STATUS.ONLINE: {
                        if (!flags.get(GenesisNetron.FLAG_IMPULSE)) {
                            const awaiter = peer._removeAwaiter(packet[GenesisNetron._STREAM_ID]);
                            !is.undefined(awaiter) && awaiter(packet[GenesisNetron._DATA]);
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

    _createPeer(socket, gate, peerType = PEER_TYPE.PASSIVE) {
        const peer = new Peer({
            netron: this,
            socket,
            packetHandler: this._processPacket,
            handlerThisArg: this,
            protocol: this.option.protocol,
            defaultPort: DEFAULT_PORT,
            responseTimeout: this.option.responseTimeout
        });
        peer._type = peerType;
        return peer;
    }
}
