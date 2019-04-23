import stringify from "./stringify";

export default (fs) => {
    const {
        is
    } = adone;
    
    return (file, obj, options, callback) => {
        if (is.nil(callback)) {
            callback = options;
            options = {};
        }
        options = options || {};
    
        let str = "";
        try {
            str = stringify(obj, options);
        } catch (err) {
            return callback(err, null);
        }
    
        fs.writeFile(file, str, options, callback);
    };    
};
