const {
    p2p: { stream: { pull, pause: Pause } }
} = adone;

describe("pull", "pause", () => {
    it("simple", (done) => {

        const pause = Pause((paused) => {
            assert.ok(paused);
            done();
        });
        let c = 0;

        pull(
            pull.count(10),
            pause,
            pull.drain((e) => {
                c += e;

                if (c > 10) {
                    pause.pause();
                }

            })
        );

    });

    it("pause, resume", (done) => {
        let p = false;
        const pause = Pause((paused) => {
            p = true;
            if (paused) {
                setTimeout(pause.resume);
            }
        });
        let c = 0;

        pull(
            pull.count(10),
            pause,
            pull.drain((e) => {
                c += e;
                if (c > 10 && !p) {
                    pause.pause();
                }
            }, () => {
                assert.equal(c, 55);
                done();
            })
        );

    });

    it("pause, resume", (done) => {
        const pause = Pause((paused) => {
            setTimeout(pause.resume, 100);
        });
        let c = 0;

        pull(
            pull.count(10),
            pause,
            pull.drain((e) => {
                c += e;
                // console.log(c);
                if (c > 5) {
                    pause.pause();
                }
            }, () => {
                assert.equal(c, 55);
                done();
            })
        );

    });

    it("without callback", (done) => {
        const pause = Pause();
        let c = 0;

        setTimeout(pause.resume, 50);
        pull(
            pull.count(10),
            pause,
            pull.drain((e) => {
                c += e;
                if (c == 5) {
                    pause.pause();
                }
            }, () => {
                assert.equal(c, 55);
                done();
            })
        );
    });
});
