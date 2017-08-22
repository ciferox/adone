const { std: { crypto } } = adone;

export const binary = (data, callback) => {
    const base64 = crypto.createHash("md5").update(data, "binary").digest("base64");
    callback(base64);
};

export const string = (string) => {
    return crypto.createHash("md5").update(string, "binary").digest("hex");
};
