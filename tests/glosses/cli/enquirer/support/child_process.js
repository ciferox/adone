require("adone");

adone.cli.Enquirer.prompt({
    type: "input",
    name: "color",
    message: "Favorite color?"
}).then((answers) => {
    console.info(answers);
    process.exit(0);
});
