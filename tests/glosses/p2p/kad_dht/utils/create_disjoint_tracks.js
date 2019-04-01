const distance = require("xor-distance");
const waterfall = require("async/waterfall");
const map = require("async/map");

const {
    multiformat: { multihashingAsync: multihashing }
} = adone;

const convertPeerId = function (peer, callback) {
    multihashing.digest(peer.id, "sha2-256", callback);
};

const sortClosestPeers = function (peers, target, callback) {
    map(peers, (peer, cb) => {
        convertPeerId(peer, (err, id) => {
            if (err) {
                return cb(err);
            }

            cb(null, {
                peer,
                distance: distance(id, target)
            });
        });
    }, (err, distances) => {
        if (err) {
            return callback(err);
        }

        callback(null, distances.sort(xorCompare).map((d) => d.peer));
    });
};

const xorCompare = (a, b) => distance.compare(a.distance, b.distance);

/**
 * Given an array of peerInfos, decide on a target, start peers, and
 * "next", a successor function for the query to use. See comment
 * where this is called for details.
 */
const createDisjointTracks = function (peerInfos, goodLength, callback) {
    const ids = peerInfos.map((info) => info.id);
    const us = ids[0];
    let target;

    waterfall([
        (cb) => convertPeerId(us, cb),
        (ourId, cb) => {
            sortClosestPeers(ids, ourId, cb);
        },
        (sorted, cb) => {
            target = sorted[sorted.length - 1];
            sorted = sorted.slice(1); // remove our id
            const goodTrack = sorted.slice(0, goodLength);
            goodTrack.push(target); // push on target
            const badTrack = sorted.slice(goodLength, -1);
            if (badTrack.length <= goodTrack.length) {
                return cb(new Error(`insufficient number of peers; good length: ${goodTrack.length}, bad length: ${badTrack.length}`));
            }
            const tracks = [goodTrack, badTrack]; // array of arrays of nodes

            const next = (peer, trackNum) => {
                const track = tracks[trackNum];
                const pos = track.indexOf(peer);
                if (pos < 0) {
                    return null; // peer not on expected track
                }

                const nextPos = pos + 1;
                // if we're at the end of the track
                if (nextPos === track.length) {
                    if (trackNum === 0) { // good track; pathComplete
                        return {
                            end: true,
                            pathComplete: true
                        };
                    } // bad track; dead end
                    return {
                        end: true,
                        closerPeers: []
                    };

                }
                const infoIdx = ids.indexOf(track[nextPos]);
                return {
                    closerPeers: [peerInfos[infoIdx]]
                };

            };

            cb(null, target.id, [goodTrack[0], badTrack[0]], next);
        }
    ], callback);
};

module.exports = createDisjointTracks;
