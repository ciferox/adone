const {
    is,
    util
} = adone;

export default function toPromise(func) {
    //create the function we will be returning
    return function (...args) {
        // Clone arguments
        args = util.clone(args);
        const self = this;
        // if the last argument is a function, assume its a callback
        const usedCB = (is.function(args[args.length - 1])) ? args.pop() : false;
        const promise = new Promise(((fulfill, reject) => {
            let resp;
            try {
                const callback = util.once((err, mesg) => {
                    if (err) {
                        reject(err);
                    } else {
                        fulfill(mesg);
                    }
                });
                // create a callback for this invocation
                // apply the function in the orig context
                args.push(callback);
                resp = func.apply(self, args);
                if (resp && is.function(resp.then)) {
                    fulfill(resp);
                }
            } catch (e) {
                reject(e);
            }
        }));
        // if there is a callback, call it back
        if (usedCB) {
            promise.then((result) => {
                usedCB(null, result);
            }, usedCB);
        }
        return promise;
    };
}
