

/**
 * Return a function that will run a function asynchronously or synchronously
 *
 * example:
 * runAsync(wrappedFunction, callback)(...args);
 *
 * @param   {Function} func  Function to run
 * @param   {Function} cb    Callback function passed the `func` returned value
 * @return  {Function(arguments)} Arguments to pass to `func`. This function will in turn
 *                                return a Promise (Node >= 0.12) or call the callbacks.
 */

export default function runAsync(func, cb) {
    cb = cb || function () { };

    return (...args) => {
        let async = false;

        const promise = new Promise((resolve, reject) => {
            const answer = func.apply({
                async() {
                    async = true;
                    return function (err, value) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(value);
                        }
                    };
                }
            }, Array.prototype.slice.call(args));

            if (!async) {
                if (adone.is.promise(answer)) {
                    answer.then(resolve, reject);
                } else {
                    resolve(answer);
                }
            }
        });

        promise.then(cb.bind(null, null), cb);

        return promise;
    };
}

runAsync.cb = function (func, cb) {
    return runAsync((...args) => {
        if (args.length === func.length - 1) {
            args.push(this.async());
        }
        return func.apply(this, args);
    }, cb);
};
