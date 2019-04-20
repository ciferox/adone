const {
    fs2,
    path,
    std: { fs }
} = adone;

export default (dir) => {
    let items;
    try {
        items = fs.readdirSync(dir);
    } catch (err) {
        return fs2.mkdirpSync(dir);
    }

    items.forEach((item) => {
        item = path.join(dir, item);
        fs2.removeSync(item);
    });
};
