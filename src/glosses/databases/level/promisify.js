export default function () {
    let callback;
    const promise = new Promise(((resolve, reject) => {
        callback = function callback(err, value) {
            if (err) {
                reject(err);
            } else {
                resolve(value); 
            }
        };
    }));
    callback.promise = promise;
    return callback;
}
