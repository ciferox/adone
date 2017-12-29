const {
    is,
    stream: { pull }
} = adone;

export default function serializer(ps, _JSON, opts) {
    _JSON = _JSON || JSON;
    opts = opts || {};
    const separator = opts.separator || "\n";
    return {
        sink: pull(
            pull.split(separator),
            pull.map((data) => {
                if (data === "") {
                    return data;
                }
                try {
                    return _JSON.parse(data);
                } catch (e) {
                    if (!opts.ignoreErrors) {
                        throw e;

                    }
                }
            }),
            pull.filter(),
            ps.sink
        ),
        source: pull(
            ps.source,
            pull.map((data) => {
                if (!is.undefined(data)) {
                    return _JSON.stringify(data) + separator;
                }
            })
        )
    };
}
