export default function stringCompare(a, b) {
    [a, b] = [String(a), String(b)];
    const length = a.length;
    if (length !== b.length) {
        return false;
    }
    let result = 0;
    for (let i = 0; i < length; ++i) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}
