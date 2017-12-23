const {
    is
} = adone;

module.exports = function (socket, callback) {
    const remove = socket && (socket.removeEventListener || socket.removeListener);

    function cleanup() {
        if (is.function(remove)) {
            remove.call(socket, "open", handleOpen);
            remove.call(socket, "error", handleErr);
        }
    }

    function handleOpen(evt) {
        cleanup(); callback();
    }

    function handleErr(evt) {
        cleanup(); callback(evt);
    }

    // if the socket is closing or closed, return end
    if (socket.readyState >= 2) {
        return callback(true);
    }

    // if open, trigger the callback
    if (socket.readyState === 1) {
        return callback();
    }

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("error", handleErr);
};

