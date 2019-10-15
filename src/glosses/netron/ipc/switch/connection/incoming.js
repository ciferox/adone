const FSM = require("fsm-event");
const multistream = require("multistream-select");
const withIs = require("class-is");

const BaseConnection = require("./base");

class IncomingConnectionFSM extends BaseConnection {
    constructor({ connection, _switch, transportKey, peerInfo }) {
        super({
            _switch,
            name: `inc:${_switch._peerInfo.id.toB58String().slice(0, 8)}`
        });
        this.conn = connection;
        this.theirPeerInfo = peerInfo || null;
        this.theirB58Id = this.theirPeerInfo ? this.theirPeerInfo.id.toB58String() : null;
        this.ourPeerInfo = this.switch._peerInfo;
        this.transportKey = transportKey;
        this.protocolMuxer = this.switch.protocolMuxer(this.transportKey);
        this.msListener = new multistream.Listener();

        this._state = FSM("DIALED", {
            DISCONNECTED: {
                disconnect: "DISCONNECTED"
            },
            DIALED: { // Base connection to peer established
                upgrade: "UPGRADING",
                disconnect: "DISCONNECTING"
            },
            UPGRADING: { // Attempting to upgrade the connection with muxers
                done: "MUXED"
            },
            MUXED: {
                disconnect: "DISCONNECTING"
            },
            DISCONNECTING: { // Shutting down the connection
                done: "DISCONNECTED"
            }
        });

        this._state.on("DISCONNECTED", () => this._onDisconnected());
        this._state.on("UPGRADING", () => this._onUpgrading());
        this._state.on("MUXED", () => {
            this.log("successfully muxed connection to %s", this.theirB58Id || "unknown peer");
            this.emit("muxed", this.conn);
        });
        this._state.on("DISCONNECTING", () => {
            this._state("done");
        });
    }

    _onUpgrading() {
        this.log("adding the protocol muxer to the connection");
        this.protocolMuxer(this.conn, this.msListener);
        this._state("done");
    }
}

module.exports = withIs(IncomingConnectionFSM, {
    className: "IncomingConnectionFSM",
    symbolName: "libp2p-switch/IncomingConnectionFSM"
});
