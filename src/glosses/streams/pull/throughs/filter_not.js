import tester from "../util/tester";

const {
    stream: { pull }
} = adone;

export default function filterNot(test) {
    test = tester(test);
    return pull.filter((data) => !test(data));
}
