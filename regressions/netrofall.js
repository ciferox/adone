"use strict";

import adone from "../../../glosses";

adone.app({
    initialize: (app) => {
        app.option("--every <ms>", "timeout between packet-funnels (default: 100ms)", 100)
            .option("--count <cnt>", "number of random sized packets during funnel (default: 1)", 1)
            .option("--minsz <sz>", "minimum data size (default: 1)", 1)
            .option("--maxsz <sz>", "maximum data size (default: 1024)", 1024);
    },
    main: (core, app) => {
        let countA = 0, countB = 0;
        let balance = 0;
        const netronA = new adone.net.Netron("a");
        const netronB = new adone.net.Netron("b");

        const ctxA = {
            touch: (data) => {
                if (++countA >= Number.MAX_SAFE_INTEGER) {
                    countA = 1;
                }
                --balance;
            }
        };

        const ctxB = {
            touch: (data) => {
                if (++countB >= Number.MAX_SAFE_INTEGER) {
                    countB = 1;
                }
                ++balance;
            }
        };

        netronA.expose("_", ctxA);
        netronB.expose("_", ctxB);

        return netronA.bind().then(() => netronB.connect()).then(() => {
            const everytm = parseInt(app.opt("every"));
            const cnt = parseInt(app.opt("count"));
            const minsz = parseInt(app.opt("minsz"));
            const maxsz = parseInt(app.opt("maxsz"));

            const bufPool = [];
            let dataSize = 0;
            for (let i = 0; i < cnt; ++i) {
                const buf = adone.std.crypto.randomBytes(adone.math.random(minsz, maxsz));
                dataSize += buf.length;
                bufPool.push(buf);
            }

            dataSize = adone.text.humanizeSize(dataSize);

            const funnel = () => {
                const startedTs = adone.microtime.now();
                const ps = [];
                for (let i = 0; i < cnt; ++i) {
                    const buf = bufPool[i];
                    ps.push(netronB.call("a", "_", "touch", buf));
                    ps.push(netronA.call("b", "_", "touch", buf));
                }
                Promise.all(ps).then(() => {
                    const endedTs = adone.microtime.now();
                    const ms = (endedTs - startedTs) / 1000;
                    const reqsPerSec = (1000 * (cnt << 1)) / ms;
                    console.log("%d ms; %s/s; %d R/s; balance: %d; total reqs: %d", ms, dataSize, reqsPerSec >>> 0, balance, countA + countB);
                    setTimeout(funnel, everytm);
                });
            };
            funnel();
        });
    }
});
