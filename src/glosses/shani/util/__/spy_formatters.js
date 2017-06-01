const { shani: { util } } = adone;
const { __ } = util;


const colorSinonMatchText = (matcher, calledArg, calledArgMessage) => {
    if (!matcher.test(calledArg)) {
        matcher.message = __.color.red(matcher.message);
        if (calledArgMessage) {
            calledArgMessage = __.color.green(calledArgMessage);
        }
    }
    return `${calledArgMessage} ${matcher.message}`;
};

const colorDiffText = (diff) => {
    const objects = diff.map((part) => {
        let text = part.value;
        if (part.added) {
            text = __.color.green(text);
        } else if (part.removed) {
            text = __.color.red(text);
        }
        if (diff.length === 2) {
            text += " "; // format simple diffs
        }
        return text;
    });
    return objects.join("");
};

export default {
    c(spyInstance) {
        return __.util.timesInWords(spyInstance.callCount);
    },

    n(spyInstance) {
        return spyInstance.toString();
    },

    D(spyInstance, args) {
        let message = "";

        for (let i = 0, l = spyInstance.callCount; i < l; ++i) {
            // describe multiple calls
            if (l > 1) {
                if (i > 0) {
                    message += "\n";
                }
                message += `Call ${i + 1}:`;
            }
            const calledArgs = spyInstance.getCall(i).args;
            for (let j = 0; j < calledArgs.length || j < args.length; ++j) {
                message += "\n";
                const calledArgMessage = j < calledArgs.length ? __.util.format(calledArgs[j]) : "";
                if (util.match.isMatcher(args[j])) {
                    message += colorSinonMatchText(args[j], calledArgs[j], calledArgMessage);
                } else {
                    const expectedArgMessage = j < args.length ? __.util.format(args[j]) : "";
                    const diff = adone.diff.json(calledArgMessage, expectedArgMessage);
                    message += colorDiffText(diff);
                }
            }
        }

        return message;
    },

    C(spyInstance) {
        const calls = [];

        for (let i = 0, l = spyInstance.callCount; i < l; ++i) {
            let stringifiedCall = `    ${spyInstance.getCall(i).toString()}`;
            if (/\n/.test(calls[i - 1])) {
                stringifiedCall = `\n${stringifiedCall}`;
            }
            calls.push(stringifiedCall);
        }

        return calls.length > 0 ? `\n${calls.join("\n")}` : "";
    },

    t(spyInstance) {
        const objects = [];

        for (let i = 0, l = spyInstance.callCount; i < l; ++i) {
            objects.push(__.util.format(spyInstance.thisValues[i]));
        }

        return objects.join(", ");
    },

    "*"(spyInstance, args) {
        return args.map((arg) => {
            return __.util.format(arg);
        }).join(", ");
    }
};
