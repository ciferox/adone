const {
    is,
    stream: { pull2: { through2 } }
} = adone;

module.exports = function split(matcher, mapper, reverse, last) {
    let soFar = "";
    if (is.function(matcher)) {
        mapper = matcher, matcher = null;
    }
    if (!matcher) {
        matcher = "\n";
    }

    const map = function (stream, piece) {
        if (mapper) {
            piece = mapper(piece);
            if (!is.undefined(piece)) {
                stream.queue(piece);
            }
        } else {
            stream.queue(piece);
        }
    }

    return through2(function (buffer) {
        const stream = this;
        const pieces = (reverse
            ? buffer + soFar
            : soFar + buffer
        ).split(matcher);

        soFar = reverse ? pieces.shift() : pieces.pop();
        const l = pieces.length;
        for (let i = 0; i < l; i++) {
            map(stream, pieces[reverse ? l - 1 - i : i]);
        }
    },
        function () {
            if (last && soFar == "") {
                return this.queue(null);
            }

            (!is.nil(soFar));
            // && (last && soFar != ''))
            map(this, soFar);

            this.queue(null);
        });
};




