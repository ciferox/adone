const {
    is
} = adone;

const arr = [];

const decirc = function (val, k, stack, parent) {
    let i;
    if (typeof val === "object" && !is.null(val)) {
        for (i = 0; i < stack.length; i++) {
            if (stack[i] === val) {
                parent[k] = "[Circular]";
                arr.push([parent, k, val]);
                return;
            }
        }
        stack.push(val);
        // Optimize for Arrays. Big arrays could kill the performance otherwise!
        if (is.array(val)) {
            for (i = 0; i < val.length; i++) {
                decirc(val[i], i, stack, val);
            }
        } else {
            const keys = Object.keys(val);
            for (i = 0; i < keys.length; i++) {
                const key = keys[i];
                decirc(val[key], key, stack, val);
            }
        }
        stack.pop();
    }
};

// Regular stringify
export default function (obj, replacer, spacer) {
    decirc(obj, "", [], undefined);
    const res = JSON.stringify(obj, replacer, spacer);
    while (arr.length !== 0) {
        const part = arr.pop();
        part[0][part[1]] = part[2];
    }
    return res;
}

// PREVIOUS VERSION is not stable for some cases

// export const stringify = (input) => {
//     const queue = [];
//     queue.push({ obj: input });

//     let res = "";
//     let next;
//     let obj;
//     let prefix;
//     let val;
//     let i;
//     let arrayPrefix;
//     let keys;
//     let k;
//     let key;
//     let value;
//     let objPrefix;

//     while ((next = queue.pop())) {
//         obj = next.obj;
//         prefix = next.prefix || "";
//         val = next.val || "";
//         res += prefix;
//         if (val) {
//             res += val;
//         } else if (!is.object(obj)) {
//             res += is.undefined(obj) ? null : JSON.stringify(obj);
//         } else if (is.null(obj)) {
//             res += "null";
//         } else if (is.array(obj)) {
//             queue.push({ val: "]" });
//             for (i = obj.length - 1; i >= 0; i--) {
//                 arrayPrefix = i === 0 ? "" : ",";
//                 queue.push({ obj: obj[i], prefix: arrayPrefix });
//             }
//             queue.push({ val: "[" });
//         } else { // object
//             keys = [];
//             for (k in obj) {
//                 if (obj.hasOwnProperty(k)) {
//                     keys.push(k);
//                 }
//             }
//             queue.push({ val: "}" });
//             for (i = keys.length - 1; i >= 0; i--) {
//                 key = keys[i];
//                 value = obj[key];
//                 objPrefix = (i > 0 ? "," : "");
//                 objPrefix += `${JSON.stringify(key)}:`;
//                 queue.push({ obj: value, prefix: objPrefix });
//             }
//             queue.push({ val: "{" });
//         }
//     }
//     return res;
// };
