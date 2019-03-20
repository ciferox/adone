const parallel = require("async/parallel");

const {
    p2p: { PeerId, PeerInfo },
    stream: { pull }
} = adone;

const fixtures = require("./test-data/ids.json").infos;

exports.createInfos = (num, callback) => {
    const tasks = [];

    for (let i = 0; i < num; i++) {
        tasks.push((cb) => {
            if (fixtures[i]) {
                PeerId.createFromJSON(fixtures[i].id, (err, id) => {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, new PeerInfo(id));
                });
                return;
            }

            PeerInfo.create(cb);
        });
    }

    parallel(tasks, callback);
};

exports.tryEcho = (conn, callback) => {
    const values = [Buffer.from("echo")];

    pull(
        pull.values(values),
        conn,
        pull.collect((err, _values) => {
            expect(err).to.not.exist();
            expect(_values).to.eql(values);
            callback();
        })
    );
};

/**
 * A utility method for calling done multiple times to help with async
 * testing
 *
 * @param {Number} n The number of times done will be called
 * @param {Function} willFinish An optional callback for cleanup before done is called
 * @param {Function} done
 * @returns {void}
 */
exports.doneAfter = (n, willFinish, done) => {
    if (!done) {
        done = willFinish;
        willFinish = undefined;
    }

    let count = 0;
    const errors = [];
    return (err) => {
        count++;
        if (err) {
            errors.push(err);
        }
        if (count >= n) {
            if (willFinish) {
                willFinish();
            }
            done(errors.length > 0 ? errors : null);
        }
    };
};
