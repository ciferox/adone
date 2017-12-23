const {
    stream: { pull }
} = adone;

export default function (stream, goodbye) {
    goodbye = goodbye || "GOODBYE";
    const e = pull.endable(goodbye);

    return {
        // when the source ends,
        // send the goodbye and then wait to recieve
        // the other goodbye.
        source: pull(stream.source, e),
        sink: pull(
            //when the goodbye is received, allow the source to end.
            pull.filter((data) => {
                if (data !== goodbye) {
                    return true;

                }
                e.end();
            }),
            stream.sink
        )
    };

};
