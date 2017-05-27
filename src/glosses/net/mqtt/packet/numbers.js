const max = 65536;
const cache = {};
let buffer;

for (let i = 0; i < max; i++) {
    buffer = Buffer.allocUnsafe(2);
    buffer.writeUInt8(i >> 8, 0, true);
    buffer.writeUInt8(i & 0x00FF, 0 + 1, true);
    cache[i] = buffer;
}

export default cache;
