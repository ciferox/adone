const {
    stream: { pull }
} = adone;

export default function log(done) {
    return pull.drain((data) => {
        console.log(data);
    }, done);
}
