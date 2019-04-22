const {
    fs2,
    path
} = adone;
const { base } = fs2;

export default (file) => {
    let stats;
    try {
        stats = base.statSync(file);
    } catch (e) {
        //
    }
    if (stats && stats.isFile()) {
        return;
    }

    const dir = path.dirname(file);
    if (!base.existsSync(dir)) {
        fs2.mkdirpSync(dir);
    }

    base.writeFileSync(file, "");
};
