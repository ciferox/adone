const { EventEmitter } = require("events");
const debug = require("debug");
const withIs = require("class-is");

class BaseConnection extends EventEmitter {
    constructor({ _switch, name }) {
        super();

        this.switch = _switch;
        this.ourPeerInfo = this.switch._peerInfo;
        this.log = debug(`libp2p:conn:${name}`);
        this.log.error = debug(`libp2p:conn:${name}:error`);
    }

    /**
     * Puts the state into its disconnecting flow
     *
     * @param {Error} err Will be emitted if provided
     * @returns {void}
     */
    close(err) {
        if (this._state._state === "DISCONNECTING") return;
        this.log("closing connection to %s", this.theirB58Id);
        if (err && this._events.error) {
            this.emit("error", err);
        }
        this._state("disconnect");
    }

    emit(eventName, ...args) {
        if (eventName === "error" && !this._events.error) {
            this.log.error(...args);
        } else {
            super.emit(eventName, ...args);
        }
    }

    /**
     * Gets the current state of the connection
     *
     * @returns {string} The current state of the connection
     */
    getState() {
        return this._state._state;
    }

    /**
     * Puts the state into muxing mode
     *
     * @returns {void}
     */
    upgrade() {
        this._state("upgrade");
    }

    /**
     * Event handler for disconnected.
     *
     * @fires BaseConnection#close
     * @returns {void}
     */
    _onDisconnected() {
        this.switch.connection.remove(this);
        this.log("disconnected from %s", this.theirB58Id);
        this.emit("close");
        this.removeAllListeners();
    }
}

module.exports = withIs(BaseConnection, {
    className: "BaseConnection",
    symbolName: "libp2p-switch/BaseConnection"
});
