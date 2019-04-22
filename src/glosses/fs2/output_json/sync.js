const {
    fs2,
    path
} = adone;
const { base } = fs2;

export default (file, data, options) => {
    const dir = path.dirname(file);

    if (!base.existsSync(dir)) {
        fs2.mkdirpSync(dir);
    }

    fs2.writeJsonSync(file, data, options);
};
