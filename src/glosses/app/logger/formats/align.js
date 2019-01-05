const {
    app: { logger: { format } }
} = adone;

/**
 * function align (info)
 * Returns a new instance of the align Format which adds a `\t`
 * delimiter before the message to properly align it in the same place.
 */
export default format((info) => {
    info.message = `\t${info.message}`;
    return info;
});
