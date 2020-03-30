const {
    cli,
    fs,
    app: {
        Subsystem,
        subsystem,
        command
    },
    nodejs,
    semver,
    pretty,
    std
} = adone;
// const { chalk, style, chalkify } = cli;

// const activeStyle = chalkify("bold.underline", chalk);
// const cachedStyle = chalkify("#388E3C", chalk);
// const inactiveStyle = chalkify("white", chalk);
// const bullet = `${adone.text.unicode.symbol.bullet} `;
// const indent = " ".repeat(bullet.length);

// const IGNORE_FILES = ["LICENSE", "CHANGELOG.md", "README.md"];
const subCommand = (...args) => adone.path.join(__dirname, "commands", ...args);

@subsystem({
    subsystems: [
        {
            name: "repo",
            description: "Repository management",
            subsystem: subCommand("repository")
        }
    ]
})
export default () => class GithubCommand extends Subsystem {
}
