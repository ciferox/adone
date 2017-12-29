const {
    stream: { pull }
} = adone;

export default function onEnd(done) {
    return pull.drain(null, done);
}
