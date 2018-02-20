const {
    is,
    error,
    lazify
} = adone;

const parsers = lazify({
    JavaScript: "./javascript",
    Hiredis: "./hiredis"
}, null, require);

export default function createParser(options) {
    if (!options || !is.function(options.returnError) || !is.function(options.returnReply)) {
        throw new error.Exception("Please provide all return functions while initiating the parser");
    }

    options.name = (options.name || "hiredis").toLowerCase();

    const innerOptions = {
        // The hiredis parser expects underscores
        return_buffers: options.returnBuffers || false, // eslint-disable-line camelcase
        string_numbers: options.stringNumbers || false // eslint-disable-line camelcase
    };
    let parser;
    if (options.name === "javascript" || options.stringNumbers) {
        parser = new parsers.JavaScript(innerOptions);
    } else {
        parser = new parsers.Hiredis(innerOptions);
    }

    parser.returnError = options.returnError;
    parser.returnFatalError = options.returnFatalError || options.returnError;
    parser.returnReply = options.returnReply;
    return parser;
}
