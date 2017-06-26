import protocol from "./constants";
import * as numbers from "./numbers";
const empty = Buffer.allocUnsafe(0);
const zeroBuf = Buffer.from([0]);
const nextTick = require("process-nextick-args");
const { is } = adone;

const numCache = numbers.cache;
const generateNumber = numbers.generateNumber;
const generateCache = numbers.generateCache;

const writeNumberCached = (stream, number) => stream.write(numCache[number]);
const writeNumberGenerated = (stream, number) => stream.write(generateNumber(number));

let writeNumber = writeNumberCached;
let toGenerate = true;

const uncork = (stream) => stream.uncork();

const byteLength = (bufOrString) => {
    if (!bufOrString) {
        return 0;
    } else if (is.buffer(bufOrString)) {
        return bufOrString.length;
    }
    return Buffer.byteLength(bufOrString);
};

const calcLengthLength = (length) => {
    if (length >= 0 && length < 128) {
        return 1;
    } else if (length >= 128 && length < 16384) {
        return 2;
    } else if (length >= 16384 && length < 2097152) {
        return 3;
    } else if (length >= 2097152 && length < 268435456) {
        return 4;
    }
    return 0;
};

const genBufLength = (length) => {
    let digit = 0;
    let pos = 0;
    const buffer = Buffer.allocUnsafe(calcLengthLength(length));

    do {
        digit = length % 128 | 0;
        length = length / 128 | 0;
        if (length > 0) {
            digit = digit | 0x80;
        }

        buffer.writeUInt8(digit, pos++, true);
    } while (length > 0);

    return buffer;
};

const lengthCache = {};
const writeLength = (stream, length) => {
    let buffer = lengthCache[length];

    if (!buffer) {
        buffer = genBufLength(length);
        if (length < 16384) {
            lengthCache[length] = buffer;
        }
    }

    stream.write(buffer);
};

const writeString = (stream, string) => {
    const strlen = Buffer.byteLength(string);
    writeNumber(stream, strlen);

    stream.write(string, "utf8");
};

const writeStringOrBuffer = (stream, toWrite) => {
    if (toWrite && is.string(toWrite)) {
        writeString(stream, toWrite);
    } else if (toWrite) {
        writeNumber(stream, toWrite.length);
        stream.write(toWrite);
    } else {
        writeNumber(stream, 0);
    }
};

const connect = (opts, stream) => {
    const settings = opts || {};
    const protocolId = settings.protocolId || "MQTT";
    const protocolVersion = settings.protocolVersion || 4;
    const will = settings.will;
    let clean = settings.clean;
    const keepalive = settings.keepalive || 0;
    const clientId = settings.clientId || "";
    const username = settings.username;
    const password = settings.password;

    if (is.undefined(clean)) {
        clean = true;
    }

    let length = 0;

    // Must be a string and non-falsy
    if (!protocolId ||
        (!is.string(protocolId) && !is.buffer(protocolId))) {
        stream.emit("error", new Error("Invalid protocolId"));
        return false;
    }

    length += protocolId.length + 2;

    // Must be 3 or 4
    if (protocolVersion !== 3 && protocolVersion !== 4) {
        stream.emit("error", new Error("Invalid protocol version"));
        return false;
    } length += 1;

    // ClientId might be omitted in 3.1.1, but only if cleanSession is set to 1
    if ((is.string(clientId) || is.buffer(clientId)) &&
        (clientId || protocolVersion === 4) && (clientId || clean)) {
        length += clientId.length + 2;
    } else {
        if (protocolVersion < 4) {
            stream.emit("error", new Error("clientId must be supplied before 3.1.1"));
            return false;
        }
        if ((Number(clean)) === 0) {
            stream.emit("error", new Error("clientId must be given if cleanSession set to 0"));
            return false;
        }
    }

    // Must be a two byte number
    if (!is.number(keepalive) ||
        keepalive < 0 ||
        keepalive > 65535 ||
        keepalive % 1 !== 0) {
        stream.emit("error", new Error("Invalid keepalive"));
        return false;
    } length += 2;

    // Connect flags
    length += 1;

    // If will exists...
    if (will) {
        // It must be an object
        if (!is.object(will)) {
            stream.emit("error", new Error("Invalid will"));
            return false;
        }
        // It must have topic typeof string
        if (!will.topic || !is.string(will.topic)) {
            stream.emit("error", new Error("Invalid will topic"));
            return false;
        }
        length += Buffer.byteLength(will.topic) + 2;


        // Payload
        if (will.payload && will.payload) {
            if (will.payload.length >= 0) {
                if (is.string(will.payload)) {
                    length += Buffer.byteLength(will.payload) + 2;
                } else {
                    length += will.payload.length + 2;
                }
            } else {
                stream.emit("error", new Error("Invalid will payload"));
                return false;
            }
        } else {
            length += 2;
        }
    }

    // Username
    if (username) {
        if (username.length) {
            length += Buffer.byteLength(username) + 2;
        } else {
            stream.emit("error", new Error("Invalid username"));
            return false;
        }
    }

    // Password
    if (password) {
        if (password.length) {
            length += byteLength(password) + 2;
        } else {
            stream.emit("error", new Error("Invalid password"));
            return false;
        }
    }

    // Generate header
    stream.write(protocol.CONNECT_HEADER);

    // Generate length
    writeLength(stream, length);

    // Generate protocol ID
    writeStringOrBuffer(stream, protocolId);
    stream.write(
        protocolVersion === 4 ? protocol.VERSION4 : protocol.VERSION3
    );

    // Connect flags
    let flags = 0;
    flags |= username ? protocol.USERNAME_MASK : 0;
    flags |= password ? protocol.PASSWORD_MASK : 0;
    flags |= (will && will.retain) ? protocol.WILL_RETAIN_MASK : 0;
    flags |= (will && will.qos) ? will.qos << protocol.WILL_QOS_SHIFT : 0;
    flags |= will ? protocol.WILL_FLAG_MASK : 0;
    flags |= clean ? protocol.CLEAN_SESSION_MASK : 0;

    stream.write(Buffer.from([flags]));

    // Keepalive
    writeNumber(stream, keepalive);

    // Client ID
    writeStringOrBuffer(stream, clientId);

    // Will
    if (will) {
        writeString(stream, will.topic);
        writeStringOrBuffer(stream, will.payload);
    }

    // Username and password
    if (username) {
        writeStringOrBuffer(stream, username);
    }
    if (password) {
        writeStringOrBuffer(stream, password);
    }

    // This is a small packet that happens only once on a stream
    // We assume the stream is always free to receive more data after this
    return true;
};

const connack = (opts, stream) => {
    const settings = opts || {};
    const rc = settings.returnCode;

    // Check return code
    if (!is.number(rc)) {
        stream.emit("error", new Error("Invalid return code"));
        return false;
    }

    stream.write(protocol.CONNACK_HEADER);
    writeLength(stream, 2);
    stream.write(opts.sessionPresent ? protocol.SESSIONPRESENT_HEADER : zeroBuf);

    return stream.write(Buffer.from([rc]));
};

const publish = (opts, stream) => {
    const settings = opts || {};
    const qos = settings.qos || 0;
    const retain = settings.retain ? protocol.RETAIN_MASK : 0;
    const topic = settings.topic;
    const payload = settings.payload || empty;
    const id = settings.messageId;

    let length = 0;

    // Topic must be a non-empty string or Buffer
    if (is.string(topic)) {
        length += Buffer.byteLength(topic) + 2;
    } else if (is.buffer(topic)) {
        length += topic.length + 2;
    } else {
        stream.emit("error", new Error("Invalid topic"));
        return false;
    }

    // Get the payload length
    if (!is.buffer(payload)) {
        length += Buffer.byteLength(payload);
    } else {
        length += payload.length;
    }

    // Message ID must a number if qos > 0
    if (qos && !is.number(id)) {
        stream.emit("error", new Error("Invalid messageId"));
        return false;
    } else if (qos) {
        length += 2;
    }

    // Header
    stream.write(protocol.PUBLISH_HEADER[qos][opts.dup ? 1 : 0][retain ? 1 : 0]);

    // Remaining length
    writeLength(stream, length);

    // Topic
    writeNumber(stream, byteLength(topic));
    stream.write(topic);

    // Message ID
    if (qos > 0) {
        writeNumber(stream, id);
    }

    // Payload
    return stream.write(payload);
};

const subscribe = (opts, stream) => {
    const settings = opts || {};
    const dup = settings.dup ? protocol.DUP_MASK : 0;
    const id = settings.messageId;
    const subs = settings.subscriptions;

    let length = 0;

    // Check message ID
    if (!is.number(id)) {
        stream.emit("error", new Error("Invalid messageId"));
        return false;
    } length += 2;

    // Check subscriptions
    if (is.object(subs) && subs.length) {
        for (let i = 0; i < subs.length; i += 1) {
            const itopic = subs[i].topic;
            const iqos = subs[i].qos;

            if (!is.string(itopic)) {
                stream.emit("error", new Error("Invalid subscriptions - invalid topic"));
                return false;
            }
            if (!is.number(iqos)) {
                stream.emit("error", new Error("Invalid subscriptions - invalid qos"));
                return false;
            }

            length += Buffer.byteLength(itopic) + 2 + 1;
        }
    } else {
        stream.emit("error", new Error("Invalid subscriptions"));
        return false;
    }

    // Generate header
    stream.write(protocol.SUBSCRIBE_HEADER[1][dup ? 1 : 0][0]);

    // Generate length
    writeLength(stream, length);

    // Generate message ID
    writeNumber(stream, id);

    let result = true;

    // Generate subs
    for (let j = 0; j < subs.length; j++) {
        const sub = subs[j];
        const jtopic = sub.topic;
        const jqos = sub.qos;

        // Write topic string
        writeString(stream, jtopic);

        // Write qos
        result = stream.write(protocol.QOS[jqos]);
    }

    return result;
};

const suback = (opts, stream) => {
    const settings = opts || {};
    const id = settings.messageId;
    const granted = settings.granted;

    let length = 0;

    // Check message ID
    if (!is.number(id)) {
        stream.emit("error", new Error("Invalid messageId"));
        return false;
    } length += 2;

    // Check granted qos vector
    if (is.object(granted) && granted.length) {
        for (let i = 0; i < granted.length; i += 1) {
            if (!is.number(granted[i])) {
                stream.emit("error", new Error("Invalid qos vector"));
                return false;
            }
            length += 1;
        }
    } else {
        stream.emit("error", new Error("Invalid qos vector"));
        return false;
    }

    // header
    stream.write(protocol.SUBACK_HEADER);

    // Length
    writeLength(stream, length);

    // Message ID
    writeNumber(stream, id);

    return stream.write(Buffer.from(granted));
};

const unsubscribe = (opts, stream) => {
    const settings = opts || {};
    const id = settings.messageId;
    const dup = settings.dup ? protocol.DUP_MASK : 0;
    const unsubs = settings.unsubscriptions;

    let length = 0;

    // Check message ID
    if (!is.number(id)) {
        stream.emit("error", new Error("Invalid messageId"));
        return false;
    }
    length += 2;

    // Check unsubs
    if (is.object(unsubs) && unsubs.length) {
        for (let i = 0; i < unsubs.length; i += 1) {
            if (!is.string(unsubs[i])) {
                stream.emit("error", new Error("Invalid unsubscriptions"));
                return false;
            }
            length += Buffer.byteLength(unsubs[i]) + 2;
        }
    } else {
        stream.emit("error", new Error("Invalid unsubscriptions"));
        return false;
    }

    // Header
    stream.write(protocol.UNSUBSCRIBE_HEADER[1][dup ? 1 : 0][0]);

    // Length
    writeLength(stream, length);

    // Message ID
    writeNumber(stream, id);

    // Unsubs
    let result = true;
    for (let j = 0; j < unsubs.length; j++) {
        result = writeString(stream, unsubs[j]);
    }

    return result;
};

/* Puback, pubrec, pubrel and pubcomp */
const confirmation = (opts, stream) => {
    const settings = opts || {};
    const type = settings.cmd || "puback";
    const id = settings.messageId;
    const dup = (settings.dup && type === "pubrel") ? protocol.DUP_MASK : 0;
    let qos = 0;

    if (type === "pubrel") {
        qos = 1;
    }

    // Check message ID
    if (!is.number(id)) {
        stream.emit("error", new Error("Invalid messageId"));
        return false;
    }

    // Header
    stream.write(protocol.ACKS[type][qos][dup][0]);

    // Length
    writeLength(stream, 2);

    // Message ID
    return writeNumber(stream, id);
};

const emptyPacket = (opts, stream) => stream.write(protocol.EMPTY[opts.cmd]);

const generate = function (packet, stream) {
    if (stream.cork) {
        stream.cork();
        nextTick(uncork, stream);
    }

    if (toGenerate) {
        toGenerate = false;
        generateCache();
    }

    switch (packet.cmd) {
        case "connect":
            return connect(packet, stream);
        case "connack":
            return connack(packet, stream);
        case "publish":
            return publish(packet, stream);
        case "puback":
        case "pubrec":
        case "pubrel":
        case "pubcomp":
        case "unsuback":
            return confirmation(packet, stream);
        case "subscribe":
            return subscribe(packet, stream);
        case "suback":
            return suback(packet, stream);
        case "unsubscribe":
            return unsubscribe(packet, stream);
        case "pingreq":
        case "pingresp":
        case "disconnect":
            return emptyPacket(packet, stream);
        default:
            stream.emit("error", new Error("Unknown command"));
            return false;
    }
};

/**
 * Controls numbers cache.
 * Set to "false" to allocate buffers on-the-flight instead of pre-generated cache
 */
Object.defineProperty(generate, "cacheNumbers", {
    get() {
        return writeNumber === writeNumberCached;
    },
    set(value) {
        if (value) {
            if (!numCache || Object.keys(numCache).length === 0) {
                toGenerate = true;
            }
            writeNumber = writeNumberCached;
        } else {
            toGenerate = false;
            writeNumber = writeNumberGenerated;
        }
    }
});

export default generate;
