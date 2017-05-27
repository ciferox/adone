import Packet from "./packet";
import constants from "./constants";

const { is } = adone;

export default class Parser extends adone.EventEmitter {
    constructor() {
        super();
        this._states = [
            "_parseHeader",
            "_parseLength",
            "_parsePayload",
            "_newPacket"
        ];

        this._resetState();
    }

    _resetState() {
        this.packet = new Packet();
        this.error = null;
        this._list = new adone.collection.BufferList();
        this._stateCounter = 0;
    }

    parse(buf) {
        if (this.error) {
            this._resetState();
        }

        this._list.append(buf);

        while ((this.packet.length !== -1 || this._list.length > 0) &&
            this[this._states[this._stateCounter]]() &&
            !this.error) {
            this._stateCounter++;

            if (this._stateCounter >= this._states.length) {
                this._stateCounter = 0;
            }
        }

        return this._list.length;
    }

    _parseHeader() {
        // There is at least one byte in the buffer
        const zero = this._list.readUInt8(0);
        this.packet.cmd = constants.types[zero >> constants.CMD_SHIFT];
        this.packet.retain = (zero & constants.RETAIN_MASK) !== 0;
        this.packet.qos = (zero >> constants.QOS_SHIFT) & constants.QOS_MASK;
        this.packet.dup = (zero & constants.DUP_MASK) !== 0;

        this._list.consume(1);

        return true;
    }

    _parseLength() {
        // There is at least one byte in the list
        let bytes = 0;
        let mul = 1;
        let length = 0;
        let result = true;
        let current;

        while (bytes < 5) {
            current = this._list.readUInt8(bytes++);
            length += mul * (current & constants.LENGTH_MASK);
            mul *= 0x80;

            if ((current & constants.LENGTH_FIN_MASK) === 0) {
                break;
            }
            if (this._list.length <= bytes) {
                result = false;
                break;
            }
        }

        if (result) {
            this.packet.length = length;
            this._list.consume(bytes);
        }

        return result;
    }

    _parsePayload() {
        let result = false;

        // Do we have a payload? Do we have enough data to complete the payload?
        // PINGs have no payload
        if (this.packet.length === 0 || this._list.length >= this.packet.length) {
            this._pos = 0;

            switch (this.packet.cmd) {
                case "connect":
                    this._parseConnect();
                    break;
                case "connack":
                    this._parseConnack();
                    break;
                case "publish":
                    this._parsePublish();
                    break;
                case "puback":
                case "pubrec":
                case "pubrel":
                case "pubcomp":
                    this._parseMessageId();
                    break;
                case "subscribe":
                    this._parseSubscribe();
                    break;
                case "suback":
                    this._parseSuback();
                    break;
                case "unsubscribe":
                    this._parseUnsubscribe();
                    break;
                case "unsuback":
                    this._parseUnsuback();
                    break;
                case "pingreq":
                case "pingresp":
                case "disconnect":
                    // These are empty, nothing to do
                    break;
                default:
                    this._emitError(new Error("Not supported"));
            }

            result = true;
        }

        return result;
    }

    _parseConnect() {
        let topic; // Will topic
        let payload; // Will payload
        let password; // Password
        let username; // Username
        const flags = {};
        const packet = this.packet;

        // Parse protocolId
        const protocolId = this._parseString();

        if (is.null(protocolId)) {
            return this._emitError(new Error("Cannot parse protocolId"));
        }
        if (protocolId !== "MQTT" && protocolId !== "MQIsdp") {
            return this._emitError(new Error("Invalid protocolId"));
        }

        packet.protocolId = protocolId;

        // Parse constants version number
        if (this._pos >= this._list.length) {
            return this._emitError(new Error("Packet too short"));
        }

        packet.protocolVersion = this._list.readUInt8(this._pos);

        if (packet.protocolVersion !== 3 && packet.protocolVersion !== 4) {
            return this._emitError(new Error("Invalid protocol version"));
        }

        this._pos++;

        if (this._pos >= this._list.length) {
            return this._emitError(new Error("Packet too short"));
        }

        // Parse connect flags
        flags.username = (this._list.readUInt8(this._pos) & constants.USERNAME_MASK);
        flags.password = (this._list.readUInt8(this._pos) & constants.PASSWORD_MASK);
        flags.will = (this._list.readUInt8(this._pos) & constants.WILL_FLAG_MASK);

        if (flags.will) {
            packet.will = {};
            packet.will.retain = (this._list.readUInt8(this._pos) & constants.WILL_RETAIN_MASK) !== 0;
            packet.will.qos = (this._list.readUInt8(this._pos) &
                constants.WILL_QOS_MASK) >> constants.WILL_QOS_SHIFT;
        }

        packet.clean = (this._list.readUInt8(this._pos) & constants.CLEAN_SESSION_MASK) !== 0;
        this._pos++;

        // Parse keepalive
        packet.keepalive = this._parseNum();
        if (packet.keepalive === -1) {
            return this._emitError(new Error("Packet too short"));
        }

        // Parse clientId
        const clientId = this._parseString();
        if (is.null(clientId)) {
            return this._emitError(new Error("Packet too short"));
        }
        packet.clientId = clientId;

        if (flags.will) {
            // Parse will topic
            topic = this._parseString();
            if (is.null(topic)) {
                return this._emitError(new Error("Cannot parse will topic"));
            }
            packet.will.topic = topic;

            // Parse will payload
            payload = this._parseBuffer();
            if (is.null(payload)) {
                return this._emitError(new Error("Cannot parse will payload"));
            }
            packet.will.payload = payload;
        }

        // Parse username
        if (flags.username) {
            username = this._parseString();
            if (is.null(username)) {
                return this._emitError(new Error("Cannot parse username"));
            }
            packet.username = username;
        }

        // Parse password
        if (flags.password) {
            password = this._parseBuffer();
            if (is.null(password)) {
                return this._emitError(new Error("Cannot parse password"));
            }
            packet.password = password;
        }

        return packet;
    }

    _parseConnack() {
        const packet = this.packet;

        if (this._list.length < 2) {
            return null;
        }

        packet.sessionPresent = Boolean(this._list.readUInt8(this._pos++) & constants.SESSIONPRESENT_MASK);
        packet.returnCode = this._list.readUInt8(this._pos);

        if (packet.returnCode === -1) {
            return this._emitError(new Error("Cannot parse return code"));
        }
    }

    _parsePublish() {
        const packet = this.packet;
        packet.topic = this._parseString();

        if (is.null(packet.topic)) {
            return this._emitError(new Error("Cannot parse topic"));
        }

        // Parse messageId
        if (packet.qos > 0) {
            if (!this._parseMessageId()) {
                return;
            }
        }

        packet.payload = this._list.slice(this._pos, packet.length);
    }

    _parseSubscribe() {
        const packet = this.packet;
        let topic;
        let qos;

        if (packet.qos !== 1) {
            return this._emitError(new Error("Wrong subscribe header"));
        }

        packet.subscriptions = [];

        if (!this._parseMessageId()) {
            return;
        }

        while (this._pos < packet.length) {
            // Parse topic
            topic = this._parseString();
            if (is.null(topic)) {
                return this._emitError(new Error("Cannot parse topic"));
            }

            qos = this._list.readUInt8(this._pos++);

            // Push pair to subscriptions
            packet.subscriptions.push({ topic, qos });
        }
    }

    _parseSuback() {
        this.packet.granted = [];

        if (!this._parseMessageId()) {
            return;
        }

        // Parse granted QoSes
        while (this._pos < this.packet.length) {
            this.packet.granted.push(this._list.readUInt8(this._pos++));
        }
    }

    _parseUnsubscribe() {
        const packet = this.packet;

        packet.unsubscriptions = [];

        // Parse messageId
        if (!this._parseMessageId()) {
            return;
        }

        while (this._pos < packet.length) {
            // Parse topic
            const topic = this._parseString();
            if (is.null(topic)) {
                return this._emitError(new Error("Cannot parse topic"));
            }

            // Push topic to unsubscriptions
            packet.unsubscriptions.push(topic);
        }
    }

    _parseUnsuback() {
        if (!this._parseMessageId()) {
            return this._emitError(new Error("Cannot parse messageId"));
        }
    }

    _parseMessageId() {
        const packet = this.packet;

        packet.messageId = this._parseNum();

        if (is.null(packet.messageId)) {
            this._emitError(new Error("Cannot parse messageId"));
            return false;
        }

        return true;
    }

    _parseString(maybeBuffer) {
        const length = this._parseNum();
        const end = length + this._pos;

        if (length === -1 || end > this._list.length || end > this.packet.length) {
            return null;
        }

        const result = this._list.toString("utf8", this._pos, end);
        this._pos += length;

        return result;
    }

    _parseBuffer() {
        const length = this._parseNum();
        const end = length + this._pos;

        if (length === -1 || end > this._list.length || end > this.packet.length) {
            return null;
        }

        const result = this._list.slice(this._pos, end);

        this._pos += length;

        return result;
    }

    _parseNum() {
        if (this._list.length - this._pos < 2) {
            return -1;
        }

        const result = this._list.readUInt16BE(this._pos);
        this._pos += 2;

        return result;
    }

    _newPacket() {
        if (this.packet) {
            this._list.consume(this.packet.length);
            this.emit("packet", this.packet);
        }

        this.packet = new Packet();

        return true;
    }

    _emitError(err) {
        this.error = err;
        this.emit("error", err);
    }
}
