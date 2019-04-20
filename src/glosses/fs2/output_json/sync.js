const {
    fs2,
    path
} = adone;
const { graceful } = fs2;

export default (file, data, options) => {
    const dir = path.dirname(file);

    if (!graceful.existsSync(dir)) {
        fs2.mkdirpSync(dir);
    }

    fs2.writeJsonSync(file, data, options);
};
