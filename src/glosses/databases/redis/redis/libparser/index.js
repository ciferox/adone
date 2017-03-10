

const parsers = adone.lazify({
    JavaScript: "./javascript",
    Hiredis: "./hiredis"
}, null, require);

export default function createParser(options) {

    if (!options || !adone.is.function(options.returnError) || !adone.is.function(options.returnReply)) {
        throw new adone.x.Exception("Please provide all return functions while initiating the parser");
    }

    options.name = options.name || "hiredis";
    options.name = options.name.toLowerCase();

    const innerOptions = {
        // The hiredis parser expects underscores
        return_buffers: options.returnBuffers || false,
        string_numbers: options.stringNumbers || false
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