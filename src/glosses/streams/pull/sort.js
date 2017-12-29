const {
    stream: { pull }
} = adone;

export default function sort(compare) {
    const source = pull.defer.source();

    const sink = pull.collect((err, ary) => {
        source.resolve(pull.values(ary.sort(compare)));
    });

    return function (read) {
        sink(read);
        return source;
    };

}
