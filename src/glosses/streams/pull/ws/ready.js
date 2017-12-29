const {
    is
} = adone;

export default function (socket, callback) {
    const remove = socket && (socket.removeEventListener || socket.removeListener);

    const cleanup = () => {
        if (is.function(remove)) {
            remove.call(socket, "open", handleOpen);
            remove.call(socket, "error", handleErr);
        }
    };

    const handleOpen = (evt) => {
        cleanup();
        callback();
    };

    const handleErr = (evt) => {
        cleanup();
        callback(evt);
    };

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
}

