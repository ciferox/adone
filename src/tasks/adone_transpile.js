import TranspileTask from "./transpile";
import { importAdoneReplacer } from "./helpers";

const {
    std
} = adone;

export default class AdoneTranspileTask extends TranspileTask {
    plugins(params) {
        const plugins = super.plugins(params);
        return plugins.concat([
            importAdoneReplacer(({ filename }) => std.path.relative(std.path.dirname(filename), std.path.join(__dirname, "..", "lib")))
        ]);
    }
};
