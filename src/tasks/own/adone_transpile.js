import TranspileTask from "../pub/transpile";
import { importAdoneReplacer } from "../helpers";

const {
    std
} = adone;

@adone.task.task("adoneTranspile")
export default class AdoneTranspileTask extends TranspileTask {
    plugins(params) {
        const plugins = super.plugins(params);
        return plugins.concat([
            importAdoneReplacer(({ filename }) => std.path.relative(std.path.dirname(filename), std.path.join(__dirname, "..", "lib")))
        ]);
    }
};
