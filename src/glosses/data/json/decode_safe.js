const { is } = adone;


// Convenience function for the parse function.
// This pop function is basically copied from
// pouchCollate.parseIndexableString
const pop = (obj, stack, metaStack) => {
    let lastMetaElement = metaStack[metaStack.length - 1];
    if (obj === lastMetaElement.element) {
        // popping a meta-element, e.g. an object whose value is another object
        metaStack.pop();
        lastMetaElement = metaStack[metaStack.length - 1];
    }
    const element = lastMetaElement.element;
    const lastElementIndex = lastMetaElement.index;
    if (is.array(element)) {
        element.push(obj);
    } else if (lastElementIndex === stack.length - 2) { // obj with key+value
        const key = stack.pop();
        element[key] = obj;
    } else {
        stack.push(obj); // obj with key only
    }
};

export default (str) => {
    const stack = [];
    const metaStack = []; // stack for arrays and objects
    let i = 0;
    let collationIndex;
    let parsedNum;
    let numChar;
    let parsedString;
    let lastCh;
    let numConsecutiveSlashes;
    let ch;
    let arrayElement;
    let objElement;

    for (; ;) {
        collationIndex = str[i++];
        if (collationIndex === "}" || collationIndex === "]" || is.undefined(collationIndex)) {
            if (stack.length === 1) {
                return stack.pop();
            }
            pop(stack.pop(), stack, metaStack);
            continue;

        }
        switch (collationIndex) {
            case " ":
            case "\t":
            case "\n":
            case ":":
            case ",":
                break;
            case "n":
                i += 3; // 'ull'
                pop(null, stack, metaStack);
                break;
            case "t":
                i += 3; // 'rue'
                pop(true, stack, metaStack);
                break;
            case "f":
                i += 4; // 'alse'
                pop(false, stack, metaStack);
                break;
            case "0":
            case "1":
            case "2":
            case "3":
            case "4":
            case "5":
            case "6":
            case "7":
            case "8":
            case "9":
            case "-":
                parsedNum = "";
                i--;
                for ( ; ; ) {
                    numChar = str[i++];
                    if (/[\d\.\-e\+]/.test(numChar)) {
                        parsedNum += numChar;
                    } else {
                        i--;
                        break;
                    }
                }
                pop(parseFloat(parsedNum), stack, metaStack);
                break;
            case '"':
                parsedString = "";
                lastCh = void 0;
                numConsecutiveSlashes = 0;
                for ( ; ; ) {
                    ch = str[i++];
                    if (ch !== '"' || (lastCh === "\\" && numConsecutiveSlashes % 2 === 1)) {
                        parsedString += ch;
                        lastCh = ch;
                        if (lastCh === "\\") {
                            numConsecutiveSlashes++;
                        } else {
                            numConsecutiveSlashes = 0;
                        }
                    } else {
                        break;
                    }
                }
                pop(JSON.parse(`"${parsedString}"`), stack, metaStack);
                break;
            case "[":
                arrayElement = { element: [], index: stack.length };
                stack.push(arrayElement.element);
                metaStack.push(arrayElement);
                break;
            case "{":
                objElement = { element: {}, index: stack.length };
                stack.push(objElement.element);
                metaStack.push(objElement);
                break;
            default:
                throw new Error(`Unexpectedly reached end of input: ${collationIndex}`);
        }
    }
};
