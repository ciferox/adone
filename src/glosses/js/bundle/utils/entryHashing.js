const CHAR_CODE_A = 97;
const CHAR_CODE_0 = 48;
function intToHex(num) {
    if (num < 10) {
        return String.fromCharCode(CHAR_CODE_0 + num); 
    }
    return String.fromCharCode(CHAR_CODE_A + (num - 10));
}
export function Uint8ArrayToHexString(buffer) {
    let str = "";
    // hex conversion - 2 chars per 8 bit component
    for (let i = 0; i < buffer.length; i++) {
        const num = buffer[i];
        // big endian conversion, but whatever
        str += intToHex(num >> 4);
        str += intToHex(num & 0xF);
    }
    return str;
}
export function Uint8ArrayXor(to, from) {
    for (let i = 0; i < to.length; i++) {
        to[i] = to[i] ^ from[i];
    }
    return to;
}
export function randomUint8Array(len) {
    const buffer = new Uint8Array(len);
    for (let i = 0; i < buffer.length; i++) {
        buffer[i] = Math.random() * (2 << 8); 
    }
    return buffer;
}