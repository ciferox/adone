export default {
    encode(value) {
        return (value << 1) ^ (value >> 31);
    },
    decode(value) {
        return (value >> 1) ^ (-(value & 1));
    }
};
