const {
    is
} = adone;

module.exports = function pull(a) {
    const length = arguments.length;
    if (is.function(a) && a.length === 1) {
        let args = new Array(length);
        for (var i = 0; i < length; i++) {
            args[i] = arguments[i]; 
        }
        return function (read) {
            if (is.nil(args)) {
                throw new TypeError("partial sink should only be called once!");
            }

            // Grab the reference after the check, because it's always an array now
            // (engines like that kind of consistency).
            const ref = args;
            args = null;

            // Prioritize common case of small number of pulls.
            switch (length) {
                case 1: return pull(read, ref[0]);
                case 2: return pull(read, ref[0], ref[1]);
                case 3: return pull(read, ref[0], ref[1], ref[2]);
                case 4: return pull(read, ref[0], ref[1], ref[2], ref[3]);
                default:
                    ref.unshift(read);
                    return pull.apply(null, ref);
            }
        };
    }

    let read = a;

    if (read && is.function(read.source)) {
        read = read.source;
    }

    for (var i = 1; i < length; i++) {
        const s = arguments[i];
        if (is.function(s)) {
            read = s(read);
        } else if (s && typeof s === "object") {
            s.sink(read);
            read = s.source;
        }
    }

    return read;
};
