import { commonOptions } from "../common";

const {
    app: { Subsystem, command }
} = adone;


export default class extends Subsystem {
    @command({
        name: "init",
        description: "",
        options: commonOptions
    })
    async initCommand(args, opts) {
        try {
            return 0;
        } catch (err) {
            console.log(adone.pretty.error(err));
            return 1;
        }
    }

    @command({
        name: "version",
        description: "Shows IPFS repo version information",
        options: commonOptions
    })
    async versionCommand(args, opts) {
        try {
            const ipfs = await this.parent.getIpfs();
            const version = await ipfs.repo.version();
            console.log(version);
            return 0;
        } catch (err) {
            console.log(adone.pretty.error(err));
            return 1;
        }
    }

    @command({
        name: "stat",
        description: "Get stats for the currently used repo",
        options: [
            ...commonOptions,
            {
                name: "--human",
                description: ""
            }
        ]
    })
    async statCommand(args, opts) {
        const { human } = opts.getAll();
        try {
            const ipfs = await this.parent.getIpfs();
            const stats = await ipfs.repo.stat();

            if (human) {
                stats.numObjects = stats.numObjects.toNumber();
                stats.repoSize = adone.pretty.size(stats.repoSize.toNumber()).toUpperCase();
                stats.storageMax = adone.pretty.size(stats.storageMax.toNumber()).toUpperCase();
            }

            console.log(
                `NumObjects: ${stats.numObjects}
RepoSize: ${stats.repoSize}
StorageMax: ${stats.storageMax}
RepoPath: ${stats.repoPath}
Version: ${stats.version}`);
            return 0;
        } catch (err) {
            console.log(adone.pretty.error(err));
            return 1;
        }
    }

    // TODO: 'gc' command
}
