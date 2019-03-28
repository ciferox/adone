const {
    logging: { logger },
    std: { stream }
} = adone;

/**
 * Returns a new Winston transport instance which will invoke
 * the `write` method on each call to `.log`
 *
 * @param {function} write Write function for the specified stream
 * @returns {StreamTransportInstance} A transport instance
 */
export const createMockTransport = function (write) {
    const writeable = new stream.Writable({
        objectMode: true,
        write
    });

    return new logger.transport.Stream({ stream: writeable });
};
