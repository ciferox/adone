const {
    net: {
        http: {
            server: {
                helper: {
                    isFinished
                }
            }
        }
    },
    is
} = adone;

const attachFinishedListener = (msg, callback) => {
    let finished = false;
    let socket = null;

    const onFinish = (error) => {
        if (is.boolean(error)) {
            // socket close returns boolean
            error = undefined;
        }
        msg.removeListener("end", onFinish);
        msg.removeListener("finish", onFinish);

        if (socket) {
            socket.removeListener("error", onFinish);
            socket.removeListener("close", onFinish);
        }

        finished = true;
        callback(error);
    };

    msg.on("end", onFinish).on("finish", onFinish);

    const onSocket = (_socket) => {
        // remove listener
        msg.removeListener("socket", onSocket);

        if (finished) {
            return;
        }
        if (socket) {
            // is it possible?
            return;
        }

        socket = _socket;


        socket.on("error", onFinish).on("close", onFinish);
    };

    if (msg.socket) {
        // socket already assigned
        onSocket(msg.socket);
        return;
    }

    msg.on("socket", onSocket);
};

const onFinishedListener = Symbol("onFinishedListener");

const createListener = (msg) => {
    const listener = (err) => {
        if (msg[onFinishedListener] === listener) {
            msg[onFinishedListener] = null;
        }
        if (!listener.queue) {
            return;
        }

        const { queue } = listener;
        listener.queue = null;

        for (const f of queue) {
            f(err, msg);
        }
    };

    listener.queue = [];

    return listener;
};

const attachListener = (msg, listener) => {
    let attached = msg[onFinishedListener];

    // create a private single listener with queue
    if (!attached || !attached.queue) {
        attached = msg[onFinishedListener] = createListener(msg);
        attachFinishedListener(msg, attached);
    }

    attached.queue.push(listener);
};


const onFinished = (msg, listener) => {
    if (isFinished(msg) !== false) {
        setImmediate(listener, null, msg);
        return msg;
    }

    // attach the listener to the message
    attachListener(msg, listener);

    return msg;
};

export default onFinished;
