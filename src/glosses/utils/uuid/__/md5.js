const { is, std: { crypto } } = adone;

export default function md5(bytes) {
    if (is.array(bytes)) {
        bytes = Buffer.from(bytes);
    } else if (is.string(bytes)) {
        bytes = Buffer.from(bytes, "utf8");
    }

    return crypto.createHash("md5").update(bytes).digest();
}
