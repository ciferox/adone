export const { keys } = Object;
export function blank() {
    return Object.create(null);
}
export const BLANK = blank();
export function forOwn(object, func) {
    Object.keys(object).forEach((key) => func(object[key], key));
}
export function assign(target, ...sources) {
    sources.forEach((source) => {
        for (const key in source) {
            if (Object.hasOwnProperty.call(source, key)) {
                target[key] = source[key]; 
            }
        }
    });
    return target;
}
