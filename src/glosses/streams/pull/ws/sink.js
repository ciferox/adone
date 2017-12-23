const {
    is
} = adone;

const ready = require("./ready");

/**
  ### `sink(socket, opts?)`

  Create a pull-stream `Sink` that will write data to the `socket`.

  <<< examples/write.js

**/

const nextTick = !is.undefined(setImmediate) ? setImmediate : process.nextTick;

module.exports = function (socket, opts) {
    return function (read) {
        opts = opts || {};
        const closeOnEnd = opts.closeOnEnd !== false;
        const onClose = is.function(opts) ? opts : opts.onClose;

        function next(end, data) {
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
                    return read(end, () => {});
                }
                socket.send(data);
                nextTick(() => {
                    read(null, next);
                });
            });
        }

        read(null, next);
    };
};
