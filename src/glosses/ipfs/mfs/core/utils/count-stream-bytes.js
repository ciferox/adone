const {
    stream: { pull }
} = adone;
const { through } = pull;

const countStreamBytes = (callback) => {
    let bytesRead = 0;

    return through((buffer) => {
        bytesRead += buffer.length;

        return buffer;
    }, () => {
        callback(bytesRead);
    });
};

module.exports = countStreamBytes;
