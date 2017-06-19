const { utou, atoa, atou, utoa } = adone.util.memcpy;

describe("util", "memcpy", () => {
    it("copy Buffer to Buffer", () => {
        const str = "test buffer";
        const srcBuf = Buffer.from(str);
        const targetBuf = Buffer.alloc(str.length);
        utou(targetBuf, 0, srcBuf, 0, str.length);
        assert.deepEqual(srcBuf, targetBuf);
    });

    it("copy UInt8Array to UInt8Array", () => {
        const testArr = [0xaa, 0xcb, 0xde, 0x13, 0x56, 0x85, 0xa5, 0xf1, 0x62, 0x77, 0x89, 0xfa];
        const srcBuf = new Uint8Array(testArr);
        const targetBuf = new Uint8Array(testArr.length);
        utou(targetBuf, 0, srcBuf, 0, testArr.length);
        assert.deepEqual(srcBuf, targetBuf);
    });

    it("copy ArrayBuffer to ArrayBuffer", () => {
        const srcBuf = new ArrayBuffer(64);
        const srcU32a = new Uint32Array(srcBuf);
        for (let i = 0; i < 16; i++) {
            srcU32a[i] = ((~~(Math.random() * 255)) << 24) | ((~~(Math.random() * 255)) << 16) | ((~~(Math.random() * 255)) << 8) | (~~(Math.random() * 255));
        }
        const targetBuf = new ArrayBuffer(64);
        atoa(targetBuf, 0, srcBuf, 0, 64);
        assert.deepEqual(srcBuf, targetBuf);
    });

    it("copy UInt8Array to ArrayBuffer", () => {
        const testArr = [0xaa, 0xcb, 0xde, 0x13, 0x56, 0x85, 0xa5, 0xf1, 0x62, 0x77, 0x89, 0xfa];
        const srcBuf = new Uint8Array(testArr);
        const targetBuf = new ArrayBuffer(testArr.length);
        utoa(targetBuf, 0, srcBuf, 0, testArr.length);
        const newBuf = new Uint8Array(targetBuf);
        assert.deepEqual(srcBuf, newBuf);
    });

    it("copy ArrayBuffer to Buffer", () => {
        const srcBuf = new ArrayBuffer(64);
        const srcU32a = new Uint32Array(srcBuf);
        for (let i = 0; i < 16; i++) {
            srcU32a[i] = ((~~(Math.random() * 255)) << 24) | ((~~(Math.random() * 255)) << 16) | ((~~(Math.random() * 255)) << 8) | (~~(Math.random() * 255));
        }
        const targetBuf = Buffer.alloc(64);
        atou(targetBuf, 0, srcBuf, 0, 64);
        const newBuf = Buffer.from(srcBuf);
        assert.deepEqual(targetBuf, newBuf);
    });
});
