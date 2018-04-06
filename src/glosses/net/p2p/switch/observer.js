const {
    event: { Emitter },
    stream: { pull }
} = adone;

module.exports = (swtch) => {
    let observer = null;

    const willObserve = function (peerInfo, transport, protocol, direction, bufferLength) {
        peerInfo.then((pi) => {
            if (pi) {
                const peerId = pi.id.asBase58();
                setImmediate(() => observer.emit("message", peerId, transport, protocol, direction, bufferLength));
            }
        });
    };

    const observe = function (direction) {
        return (transport, protocol, peerInfo) => {
            return pull.map((buffer) => {
                willObserve(peerInfo, transport, protocol, direction, buffer.length);
                return buffer;
            });
        };
    };

    observer = Object.assign(new Emitter(), {
        incoming: observe("in"),
        outgoing: observe("out")
    });

    swtch.on("peer:mux:established", (peerInfo) => {
        observer.emit("peer:connected", peerInfo.id.asBase58());
    });

    swtch.on("peer:mux:closed", (peerInfo) => {
        observer.emit("peer:closed", peerInfo.id.asBase58());
    });

    return observer;
};
