import adone from "adone";

const stream = adone.core()
    .map((x) => {
        return adone.Promise.delay(10 + Math.random() * 40, x);
    })
    .map((x) => {
        return adone.Promise.delay(20 + Math.random() * 80, x);
    })
    .map((x) => {
        return adone.Promise.delay(40 + Math.random() * 160, x);
    })
    .map((x) => {
        return adone.Promise.delay(80 + Math.random() * 320, x);
    })
    .map((x) => {
        return adone.Promise.delay(40 + Math.random() * 160, x);
    })
    .map((x) => {
        return adone.Promise.delay(20 + Math.random() * 80, x);
    })
    .map((x) => {
        return adone.Promise.delay(10 + Math.random() * 40, x);
    })
    .through((x) => {
        logger.log("read", x);
        return adone.Promise.delay(160 + Math.random() * 640);
    });

const screen = new adone.cui.Screen;
const transforms = stream._transforms.slice(1);
const rows = 24;
const cols = 3 + transforms.length * 3 - 2;
const grid = new adone.cui.GridLayout({ rows, cols, screen });
const logger = grid.set(0, 0, rows, 3, adone.cui.widget.Log);
let i = 2;
for (const t of transforms) {
    const push = adone.collection.LinkedList.prototype.push;
    const shift = adone.collection.LinkedList.prototype.shift;

    const w = grid.set(0, i + 1, rows - 4, 1, adone.cui.widget.ProgressBar, { barBg: "green", orientation: "vertical" });
    const wLen = grid.set(rows - 4, i + 1, 4, 1, adone.cui.widget.Element, { content: "0", align: "center", valign: "middle" });
    const wBuf = t.writable.buffer;
    let wC = 0;
    wBuf.push = (...args) => {
        w.setProgress(++wC / t.writable.highWaterMark * 100);
        screen.render();
        wLen.setContent(wC + "");
        return push.apply(wBuf, args);
    };
    wBuf.shift = (...args) => {
        w.setProgress(--wC  / t.writable.highWaterMark * 100);
        screen.render();
        wLen.setContent(wC + "");
        return shift.apply(wBuf, args);
    };
    
    if (t !== transforms[transforms.length - 1]) {
        const r = grid.set(0, i + 2, rows - 4, 1, adone.cui.widget.ProgressBar, { barBg: "red", orientation: "vertical" });
        const rBuf = t.readable.buffer;
        const rLen = grid.set(rows - 4, i + 2, 4, 1, adone.cui.widget.Element, { content: "0", align: "center", valign: "middle" });
        let rC = 0;
        rBuf.push = (...args) => {
            r.setProgress(++rC / t.readable.highWaterMark * 100);
            screen.render();
            rLen.setContent(rC + "");
            return push.apply(rBuf, args);
        };
        rBuf.shift = (...args) => {
            r.setProgress(--rC / t.readable.highWaterMark * 100);
            screen.render();
            rLen.setContent(rC + "");
            return shift.apply(rBuf, args);
        };

    }

    i += 3;
}

screen.render();

(async function() {
    const source = stream._transforms[1];

    for (let i = 0; ; ++i) {
        await adone.Promise.delay(24);
        const t = source.write(i);
        logger.log("push", i, t);
        if (!t) {
            logger.log("pause");
            await new adone.Promise((resolve) => source.once("drain", resolve));
            logger.log("resume");
        }
    }
})();