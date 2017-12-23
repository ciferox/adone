const constants = require("./constants");
const PROTOCOL = constants.PROTOCOL;
const PING_LENGTH = constants.PING_LENGTH;

const {
    stream: { pull }
} = adone;

const mount = (swarm) => {
    swarm.handle(PROTOCOL, (protocol, conn) => {
        const stream = pull.handshake({ timeout: 0 });
        const shake = stream.handshake;

        // receive and echo back
        const next = () => {
            shake.read(PING_LENGTH, (err, buf) => {
                if (err === true) {
                    // stream closed
                    return;
                }
                if (err) {
                    return adone.error(err);
                }

                shake.write(buf);
                return next();
            });
        };

        pull(
            conn,
            stream,
            conn
        );

        next();
    });
};

const unmount = (swarm) => {
    swarm.unhandle(PROTOCOL);
};

exports = module.exports;
exports.mount = mount;
exports.unmount = unmount;
