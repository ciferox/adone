import { isAbsolute, relative } from "./path";

const {
    is
} = adone;

export default function relativeId(id) {
    if (is.undefined(process) || !isAbsolute(id)) {
        return id; 
    }
    return relative(process.cwd(), id);
}
