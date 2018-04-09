const {
    multi,
    net: { p2p: { CID } },
    std
} = adone;

export default function (n) {
    const vals = [];
    for (let i = 0; i < n; i++) {
        const bytes = std.crypto.randomBytes(32);
        const h = multi.hash.create(bytes, "sha2-256");
        vals.push({
            cid: new CID(h),
            value: bytes
        });
    }

    return vals;
}
