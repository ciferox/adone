export default (fs) => {
    const {
        is,
        text: { stripBom }
    } = adone;
    
    return (file, options, callback) => {
        if (is.nil(callback)) {
            callback = options;
            options = {};
        }
    
        if (is.string(options)) {
            options = { encoding: options };
        }
    
        options = options || {};
    
        let shouldThrow = true;
        if ("throws" in options) {
            shouldThrow = options.throws;
        }
    
        fs.readFile(file, options, (err, data) => {
            if (err) {
                return callback(err);
            }
    
            data = stripBom(data);
    
            let obj;
            try {
                obj = JSON.parse(data, options ? options.reviver : null);
            } catch (err2) {
                if (shouldThrow) {
                    err2.message = `${file}: ${err2.message}`;
                    return callback(err2);
                }
                return callback(null, null);
    
            }
    
            callback(null, obj);
        });
    };    
};
