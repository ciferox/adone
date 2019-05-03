const series = require("async/series");

const {
    p2p: { PeerId }
} = adone;
const srcPath = (...args) => adone.getPath("lib", "glosses", "p2p", "kad_dht", ...args);

const PeerQueue = require(srcPath("peer-queue"));

describe("PeerQueue", () => {
    it("basics", (done) => {
        const p1 = new PeerId(Buffer.from("11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a31"));
        const p2 = new PeerId(Buffer.from("11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a32"));
        const p3 = new PeerId(Buffer.from("11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a33"));
        const p4 = new PeerId(Buffer.from("11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a34"));
        const p5 = new PeerId(Buffer.from("11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a31"));

        const peer = new PeerId(Buffer.from("11140beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a31"));

        PeerQueue.fromPeerId(peer, (err, pq) => {
            expect(err).to.not.exist();

            series([
                (cb) => pq.enqueue(p3, cb),
                (cb) => pq.enqueue(p1, cb),
                (cb) => pq.enqueue(p2, cb),
                (cb) => pq.enqueue(p4, cb),
                (cb) => pq.enqueue(p5, cb),
                (cb) => pq.enqueue(p1, cb)
            ], (err) => {
                expect(err).to.not.exist();

                expect([
                    pq.dequeue(),
                    pq.dequeue(),
                    pq.dequeue(),
                    pq.dequeue(),
                    pq.dequeue(),
                    pq.dequeue()
                ].map((m) => m.toB58String())).to.be.eql([
                    p1, p1, p1, p4, p3, p2
                ].map((m) => m.toB58String()));

                expect(pq.length).to.be.eql(0);
                done();
            });
        });
    });
});
