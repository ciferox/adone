const {
    is,
    std: { stream }
} = adone;

/**
 * Creates a stream which becomes the response body of the interceptor when a
 * delay is set. The stream outputs the intended body and EOF after the delay.
 *
 * @param  {String|Buffer|Stream} body - the body to write/pipe out
 * @param  {Integer} ms - The delay in milliseconds
 * @constructor
 */
export default class DelayedBody extends stream.PassThrough {
    constructor(ms, body) {
        super();
        const self = this;
        let data = "";
        let ended = false;

        if (is.stream(body)) {
            body.on("data", (chunk) => {
                data += is.buffer(chunk) ? chunk.toString() : chunk;
            });

            body.once("end", () => {
                ended = true;
            });

            body.resume();
        }

        setTimeout(() => {
            if (is.stream(body) && !ended) {
                body.once("end", () => {
                    self.end(data);
                });
            } else {
                self.end(data || body);
            }
        }, ms);
    }
}
