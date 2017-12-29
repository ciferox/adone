const {
    is
} = adone;

export default function (socket, cb) {
    const buffer = [];
    let receiver;
    let ended;
    let started = false;
    socket.addEventListener("message", (evt) => {
        let data = evt.data;
        if (is.arrayBuffer(data)) {
            data = Buffer.from(data);
        }

        if (receiver) {
            return receiver(null, data);
        }

        buffer.push(data);
    });

    socket.addEventListener("close", (evt) => {
        if (ended) {
            return;
        }
        if (receiver) {
            receiver(ended = true);
        }
    });

    socket.addEventListener("error", (evt) => {
        if (ended) {
            return;
        }
        ended = evt;
        if (!started) {
            started = true;
            cb && cb(evt);
        }
        if (receiver) {
            receiver(ended);
        }
    });

    socket.addEventListener("open", (evt) => {
        if (started || ended) {
            return;

        }
        started = true;
    });

    return (abort, cb) => {
        receiver = null;

        //if stream has already ended.
        if (ended) {
            return cb(ended);
        } else if (abort) {
            //this will callback when socket closes
            receiver = cb;
            socket.close();
        } else if (buffer.length > 0) {
            cb(null, buffer.shift());
        } else {
            // wait for more data (or end)
            receiver = cb;
        }
    };
}
