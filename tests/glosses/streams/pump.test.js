const {
    stream: { pump },
    std: { fs }
} = adone;

const rs = fs.createReadStream("/dev/random");
const ws = fs.createWriteStream("/dev/null");

const toHex = function () {
    const reverse = new (require("stream").Transform)();

    reverse._transform = function (chunk, enc, callback) {
        reverse.push(chunk.toString("hex"));
        callback();
    };

    return reverse;
};

describe("stream", "pump", () => {
    it("test", (done) => {
        let wsClosed = false;
        let rsClosed = false;
        let callbackCalled = false;
        let timeout = null;

        const check = function () {
            if (wsClosed && rsClosed && callbackCalled) {
                clearTimeout(timeout);
                done();
            }
        };

        ws.on("close", () => {
            wsClosed = true;
            check();
        });

        rs.on("close", () => {
            rsClosed = true;
            check();
        });

        const res = pump(rs, toHex(), toHex(), toHex(), ws, () => {
            callbackCalled = true;
            check();
        });

        if (res !== ws) {
            assert.fail();
        }

        timeout = setTimeout(() => {
            rs.destroy();
        }, 1000);
    });
});
