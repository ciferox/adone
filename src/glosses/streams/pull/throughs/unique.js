import prop from "../util/prop"; // todo

const {
    stream: { pull }
} = adone;

//drop items you have already seen.
export default function unique(field, invert) {
    field = prop(field) || adone.identity;
    const seen = {};
    return pull.filter((data) => {
        const key = field(data);
        if (seen[key]) {
            return Boolean(invert);

        } //false, by default
        seen[key] = true;
        return !invert; //true by default
    });
}
