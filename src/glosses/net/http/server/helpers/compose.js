const {
    exception
} = adone;

export default function compose(middlewares) {
    return (ctx, next, ...args) => {
        const lastIndex = -1; // to track the index of the last called middleware
        const execute = (idx, args) => {
            if (idx <= lastIndex) {
                return Promise.reject(new exception.IllegalState("next() called multiple times"));
            }
            const middleware = middlewares[idx] || next;
            if (!middleware) { // there is no other middleware
                return Promise.resolve();
            }
            try {
                return Promise.resolve(middleware.apply(null, [ctx, (...args) => execute(idx + 1, args)].concat(args)));
            } catch (err) { // a synchronous middleware throws an error
                return Promise.reject(err);
            }
        };

        return execute(0, args);
    };
}
