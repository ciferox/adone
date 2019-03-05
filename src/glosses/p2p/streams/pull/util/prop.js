const {
    is
} = adone;

module.exports = function prop(key) {
    return key && (
        is.string(key)
            ? function (data) {
                return data[key]; 
            }
            : typeof key === "object" && is.function(key.exec) //regexp
                ? function (data) {
                    const v = key.exec(data); return v && v[0]; 
                }
                : key
    );
};
