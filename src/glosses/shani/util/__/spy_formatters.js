const {
    shani: {
        util: {
            __: {
                util: { timesInWords, format },
                color
            },
            match
        }
    }
} = adone;


const colorSinonMatchText = (matcher, calledArg, calledArgMessage) => {
    if (!matcher.test(calledArg)) {
        matcher.message = color.red(matcher.message);
        if (calledArgMessage) {
            calledArgMessage = color.green(calledArgMessage);
        }
    }
    return `${calledArgMessage} ${matcher.message}`;
};

const colorDiffText = (diff) => {
    const objects = diff.map((part) => {
        let text = part.value;
        if (part.added) {
            text = color.green(text);
        } else if (part.removed) {
            text = color.red(text);
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
        return timesInWords(spyInstance.callCount);
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
                const calledArgMessage = j < calledArgs.length ? format(calledArgs[j]) : "";
                if (match.isMatcher(args[j])) {
                    message += colorSinonMatchText(args[j], calledArgs[j], calledArgMessage);
                } else {
                    const expectedArgMessage = j < args.length ? format(args[j]) : "";
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
            objects.push(format(spyInstance.thisValues[i]));
        }

        return objects.join(", ");
    },

    "*"(spyInstance, args) {
        return args.map((arg) => {
            return format(arg);
        }).join(", ");
    }
};
