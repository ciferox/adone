const {
    is,
    fs2,
    path
} = adone;
const { graceful } = fs2;

export default (file, ...args) => {
    const dir = path.dirname(file);
    if (graceful.existsSync(dir)) {
        return graceful.writeFileSync(file, ...args);
    }
    fs2.mkdirpSync(dir);
    graceful.writeFileSync(file, ...args);
};
