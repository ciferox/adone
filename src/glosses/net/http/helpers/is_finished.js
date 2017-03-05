import adone from "adone";
const { is } = adone;

const isFinished = (msg) => {
    const { socket } = msg;

    if (is.boolean(msg.finished)) {
        // OutgoingMessage
        return Boolean(msg.finished || (socket && !socket.writable));
    }

    if (is.boolean(msg.complete)) {
        // IncomingMessage
        return Boolean(msg.upgrade || !socket || !socket.readable || (msg.complete && !msg.readable));
    }

    // don't know
    return undefined;
};

export default isFinished;
