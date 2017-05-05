export default (password, keyLength, ivLength) => {
    password = Buffer.from(password);
    let m = [];
    for (let i = 0, length = 0; length < keyLength + ivLength; ++i) {
        const data = i === 0 ? password : Buffer.concat([m[i - 1], password]);
        m.push(adone.std.crypto.createHash("md5").update(data).digest());
        length += 16;  // md5 hash length
    }
    m = Buffer.concat(m, keyLength + ivLength);
    return { key: m.slice(0, keyLength), iv: m.slice(keyLength, keyLength + ivLength) };
};
