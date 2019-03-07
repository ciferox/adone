let counter = 0;

const tmpFile = (id) => `.${id}.${counter++}`;

const funcBind = (id) => tmpFile.bind(null, id);
const funcArrow = (id) => () => tmpFile(id);

export default {
    "arrow function"() {
        const fn = funcArrow(process.pid);
        return fn();
    },
    "function.bind"() {
        const fn = funcBind(process.pid);
        return fn();
    }
};
