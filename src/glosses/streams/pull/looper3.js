export default function (fun) {
    (function next() {
        let loop = true;
        let sync = false;
        do {
            sync = true; loop = false;
            // eslint-disable-next-line no-loop-func
            fun.call(this, () => {
                if (sync) {
                    loop = true;
                } else {
                    next();
                }
            });
            sync = false;
        } while (loop);
    })();
};