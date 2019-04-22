const {
    is,
    fs2,
    path
} = adone;
const { base } = fs2;

export default (file, ...args) => {
    const dir = path.dirname(file);
    if (base.existsSync(dir)) {
        return base.writeFileSync(file, ...args);
    }
    fs2.mkdirpSync(dir);
    base.writeFileSync(file, ...args);
};
