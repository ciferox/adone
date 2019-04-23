export default (fs) => {
    const {
        path
    } = adone;
    
    return (dir, callback) => {
        callback = callback || function () { };
        fs.readdir(dir, (err, items) => {
            if (err) {
                return fs.mkdirp(dir, callback);
            }
    
            items = items.map((item) => path.join(dir, item));
    
            const deleteItem = () => {
                const item = items.pop();
                if (!item) {
                    return callback();
                }
                fs.remove(item, (err) => {
                    if (err) {
                        return callback(err);
                    }
                    deleteItem();
                });
            };
    
            deleteItem();
        });
    };    
};
