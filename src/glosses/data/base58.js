const {
    data: { basex }
} = adone;

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const base58 = basex(ALPHABET);

export default base58;
