const {
    data: { baseX }
} = adone;

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const base58 = baseX(ALPHABET);

export default adone.asNamespace(base58);
