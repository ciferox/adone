const {
    fs2,
    path,
    std: { fs }
} = adone;

export default (dir, callback) => {
    callback = callback || function () { };
    fs.readdir(dir, (err, items) => {
        if (err) {
            return fs2.mkdirp(dir, callback);
        }

        items = items.map((item) => path.join(dir, item));

        const deleteItem = () => {
            const item = items.pop();
            if (!item) {
                return callback();
            }
            fs2.remove(item, (err) => {
                if (err) {
                    return callback(err);
                }
                deleteItem();
            });
        };

        deleteItem();
    });
};
