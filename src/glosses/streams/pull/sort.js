const {
    stream: { pull: { error, values, collect, defer: { source } } }
} = adone;

module.exports = function (compare) {
    const src = source();

    const sink = collect((err, ary) => {
        if (err) {
            return src.resolve(error(err));
        }

        src.resolve(values(ary.sort(compare)));
    });

    return function (read) {
        sink(read);
        return src;
    };
};
