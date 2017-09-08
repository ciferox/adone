const { is, std: { crypto } } = adone;

export default function sha1(bytes) {
    if (is.array(bytes)) {
        bytes = Buffer.from(bytes);
    } else if (is.string(bytes)) {
        bytes = Buffer.from(bytes, "utf8");
    }

    return crypto.createHash("sha1").update(bytes).digest();
}
