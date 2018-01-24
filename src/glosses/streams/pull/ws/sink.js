const {
    is,
    stream: { pull }
} = adone;

const {
    ws: {
        ready
    }
} = pull;

export default function (socket, opts) {
    return function (read) {
        opts = opts || {};
        const closeOnEnd = opts.closeOnEnd !== false;
        const onClose = is.function(opts) ? opts : opts.onClose;

        const next = (end, data) => {
            // if the stream has ended, simply return
            if (end) {
                if (closeOnEnd && socket.readyState <= 1) {
                    if (onClose) {
                        socket.addEventListener("close", (ev) => {
                            if (ev.wasClean || ev.code === 1006) {
                                onClose();

                            } else {
                                const err = new Error("ws error");
                                err.event = ev;
                                onClose(err);
                            }
                        });
                    }

                    socket.close();
                }

                return;
            }

            // socket ready?
            ready(socket, (end) => {
                if (end) {
                    return read(end, () => { });
                }
                socket.send(data);
                setImmediate(() => {
                    read(null, next);
                });
            });
        };

        read(null, next);
    };
}
