
const is = adone.is;
const ansi = adone.text.ansi;

/*
	%%		a single %
	%s		string
	%f		float
	%d	%i	integer
	%u		unsigned integer
	%U		unsigned positive integer (>0)
	%h		hexadecimal
	%x		hexadecimal, force pair of symbols (e.g. 'f' -> '0f')
	%o		octal
	%b		binary
	%I		call inspect()
    %Y		call inspect(), but do not inspect non-enumerable
	%E		call inspectError()
	%J		JSON.stringify()
	%D		drop
	%F		filter function existing in the 'this' context, e.g. %[filter:%a%a]F
	%a		argument for a function
	
	Candidate format:
	%A		for automatic type?
	%c		for char? (can receive a string or an integer translated into an UTF8 chars)
	%C		for currency formating?
	%B		for Buffer objects?
	%e		for scientific notation?
*/

const defaultFormatter = adone.o({
    extraArguments: true,
    endingMarkupReset: true,
    markupReset: ansi.reset,
    markup: adone.o({
        ":": ansi.reset,
        " ": ansi.reset + " ",

        "-": ansi.dim,
        "+": ansi.bold,
        "_": ansi.underline,
        "/": ansi.italic,
        "!": ansi.inverse,

        "b": ansi.blue,
        "B": ansi.brightBlue,
        "c": ansi.cyan,
        "C": ansi.brightCyan,
        "g": ansi.green,
        "G": ansi.brightGreen,
        "k": ansi.black,
        "K": ansi.brightBlack,
        "m": ansi.magenta,
        "M": ansi.brightMagenta,
        "r": ansi.red,
        "R": ansi.brightRed,
        "w": ansi.white,
        "W": ansi.brightWhite,
        "y": ansi.yellow,
        "Y": ansi.brightYellow
    })
});

function formatMethod(str) {
    if (!is.string(str)) {
        if (is.nil(str)) return "";
        else if (is.function(str.toString)) str = str.toString();
        else return "";
    }

    var self = this, arg, value,
        autoIndex = 1, args = arguments, length = arguments.length,
        hasMarkup = false, markupStack = [];

    //console.log( 'format args:' , arguments ) ;

    // /!\ each changes here should be reported on string.format.count() and string.format.hasFormatting() too /!\
    //str = str.replace( /\^(.?)|%(?:([+-]?)([0-9]*)(?:\/([^\/]*)\/)?([a-zA-Z%])|\[([a-zA-Z0-9_]+)(?::([^\]]*))?\])/g ,
    str = str.replace(/\^(.?)|(%%)|%([+-]?)([0-9]*)(?:\[([^\]]*)\])?([a-zA-Z])/g,
        function (match, markup, doublePercent, relative, index, modeArg, mode) {		// jshint ignore:line

            var replacement, i, n, depth, tmp, fn, fnArgString, argMatches, argList = [];

            //console.log( 'replaceArgs:' , arguments ) ;
            if (doublePercent) return "%";

            if (markup) {
                if (markup === "^") return "^";
                if (!self.markup || !self.markup[markup]) return "";
                hasMarkup = true;

                if (is.function(self.markup[markup])) {
                    replacement = self.markup[markup](markupStack);
                    // method should manage markup stack themselves
                } else {
                    replacement = self.markup[markup];
                    markupStack.push(replacement);
                }

                return replacement;
            }

            if (index) {
                index = parseInt(index);

                if (relative) {
                    if (relative === "+") index = autoIndex + index;
                    else if (relative === "-") index = autoIndex - index;
                }
            }
            else {
                index = autoIndex;
            }

            ++autoIndex;

            if (index >= length || index < 1) arg = undefined;
            else arg = args[index];

            switch (mode) {
                case "s": // string
                    if (is.nil(arg)) return "";
                    if (is.string(arg)) return arg;
                    if (is.number(arg)) return "" + arg;
                    if (is.function(arg.toString)) return arg.toString();
                    return "";
                case "f": // float
                    if (is.string(arg)) arg = parseFloat(arg);
                    if (!is.number(arg)) return "0";
                    if (!is.undefined(modeArg)) {
                        // Use jQuery number format?
                        switch (modeArg[0]) {
                            case "p":
                                n = parseInt(modeArg.slice(1), 10);
                                if (n >= 1) arg = arg.toPrecision(n);
                                break;
                            case "f":
                                n = parseInt(modeArg.slice(1), 10);
                                arg = arg.toFixed(n);
                                break;
                        }
                    }
                    return "" + arg;
                case "d":
                case "i": // integer decimal
                    if (is.string(arg)) arg = parseInt(arg);
                    if (is.number(arg)) return "" + Math.floor(arg);
                    return "0";
                case "u": // unsigned decimal
                    if (is.string(arg)) arg = parseInt(arg);
                    if (is.number(arg)) return "" + Math.max(Math.floor(arg), 0);
                    return "0";
                case "U": // unsigned positive decimal
                    if (is.string(arg)) arg = parseInt(arg);
                    if (is.number(arg)) return "" + Math.max(Math.floor(arg), 1);
                    return "1";
                case "x": // unsigned hexadecimal, force pair of symbole
                    if (is.string(arg)) arg = parseInt(arg);
                    if (!is.number(arg)) return "0";
                    value = "" + Math.max(Math.floor(arg), 0).toString(16);
                    if (value.length % 2) value = "0" + value;
                    return value;
                case "h": // unsigned hexadecimal
                    if (is.string(arg)) arg = parseInt(arg);
                    if (is.number(arg)) return "" + Math.max(Math.floor(arg), 0).toString(16);
                    return "0";
                case "o": // unsigned octal
                    if (is.string(arg)) arg = parseInt(arg);
                    if (is.number(arg)) return "" + Math.max(Math.floor(arg), 0).toString(8);
                    return "0";
                case "b": // unsigned binary
                    if (is.string(arg)) arg = parseInt(arg);
                    if (is.number(arg)) return "" + Math.max(Math.floor(arg), 0).toString(2);
                    return "0";
                case "I":
                    depth = 3;
                    if (modeArg !== undefined) {
                        depth = parseInt(modeArg, 10);
                    }
                    return adone.meta.inspect(arg, { depth, style: (self && self.color ? "color" : "none") });
                case "Y":
                    depth = 3;
                    if (modeArg !== undefined) {
                        depth = parseInt(modeArg, 10);
                    }
                    return adone.meta.inspect(arg, { depth, style: (self && self.color ? "color" : "none"), noFunc: true, enumOnly: true, noDescriptor: true });
                case "E":
                    return adone.inspectError(arg, { style: (self && self.color ? "color" : "none") });
                case "J":
                    return JSON.stringify(arg);
                case "D":
                    return "";
                case "F": // Function
                    --autoIndex; // %F does not eat any arg

                    if (is.undefined(modeArg)) return "";
                    tmp = modeArg.split(":");
                    fn = tmp[0];
                    fnArgString = tmp[1];
                    if (!fn) return "";

                    if (fnArgString && (argMatches = fnArgString.match(/%([+-]?)([0-9]*)[a-zA-Z]/g))) {
                        for (i = 0; i < argMatches.length; ++i) {
                            relative = argMatches[i][1];
                            index = argMatches[i][2];

                            if (index) {
                                index = parseInt(index, 10);

                                if (relative) {
                                    if (relative === "+") {
                                        index = autoIndex + index;
                                    } else if (relative === "-") {
                                        index = autoIndex - index;
                                    }
                                }
                            } else {
                                index = autoIndex;
                            }
                            ++autoIndex;

                            if (index >= length || index < 1) argList[i] = undefined;
                            else argList[i] = args[index];
                        }
                    }

                    if (!self || !self.fn || !is.function(self.fn[fn])) return "";
                    return self.fn[fn].apply(self, argList);
                default:
                    return "";
            }
        });

    if (hasMarkup && this.markupReset && this.endingMarkupReset) {
        str += is.function(this.markupReset) ? this.markupReset(markupStack) : this.markupReset;
    }

    if (this.extraArguments) {
        for (; autoIndex < length; ++autoIndex) {
            arg = args[autoIndex];
            if (is.nil(arg)) continue;
            else if (is.string(arg)) str += arg;
            else if (is.number(arg)) str += arg;
            else if (is.function(arg.toString)) str += arg.toString();
        }
    }

    return str;
}

const format = formatMethod.bind(defaultFormatter);
format.formatMethod = formatMethod;
format.default = defaultFormatter;
// Count the number of parameters needed for this string
format.count = function formatCount(str) {
    var match, index, relative, autoIndex = 1, maxIndex = 0;

    if (typeof str !== 'string') { return 0; }

    // This regex differs slightly from the main regex: we do not count '%%' and %F is excluded
    var regexp = /%([+-]?)([0-9]*)(?:\[([^\]]*)\])?([a-zA-EG-Z])/g;


    while ((match = regexp.exec(str)) !== null) {
        //console.log( match ) ;
        relative = match[1];
        index = match[2];

        if (index) {
            index = parseInt(index, 10);

            if (relative) {
                if (relative === '+') { index = autoIndex + index; }
                else if (relative === '-') { index = autoIndex - index; }
            }
        }
        else {
            index = autoIndex;
        }

        autoIndex++;

        if (maxIndex < index) { maxIndex = index; }
    }

    return maxIndex;
};
// Tell if this string contains formatter chars
format.hasFormatting = function hasFormatting(str) {
    return (str.search(/\^(.?)|(%%)|%([+-]?)([0-9]*)(?:\[([^\]]*)\])?([a-zA-Z])/) !== -1);
};

export default format;
