const etm = require("../etm");
const crypto = require("./crypto");

const {
    stream: { pull }
} = adone;

// step 3. Finish
// -- send expected message to verify encryption works (send local nonce)
module.exports = function finish(state, cb) {
    const proto = state.protocols;
    const stream = state.shake.rest();
    const shake = pull.handshake({ timeout: state.timeout }, (err) => {
        if (err) {
            throw err;
        }
    });

    pull(
        stream,
        etm.createUnboxStream(proto.remote.cipher, proto.remote.mac),
        shake,
        etm.createBoxStream(proto.local.cipher, proto.local.mac),
        stream
    );

    shake.handshake.write(state.proposal.in.rand);
    shake.handshake.read(state.proposal.in.rand.length, (err, nonceBack) => {
        const fail = (err) => {
            adone.logError(err);
            state.secure.resolve({
                source: pull.error(err),
                sink(read) {
                }
            });
            cb(err);
        };

        if (err) {
            return fail(err);
        }

        try {
            crypto.verifyNonce(state, nonceBack);
        } catch (err) {
            return fail(err);
        }

        // Awesome that's all folks.
        state.secure.resolve(shake.handshake.rest());
        cb();
    });
};
