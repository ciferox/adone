adone.app.run({
    main() {
        this.directionsPrompt = {
            type: "list",
            name: "direction",
            message: "Which direction would you like to go?",
            choices: ["Forward", "Right", "Left", "Back"]
        };

        console.log("You find youself in a small room, there is a door in front of you.");
        this._exitHouse();
    },
    _exitHouse() {
        adone.runtime.term.prompt().run(this.directionsPrompt).then((answers) => {
            if (answers.direction === "Forward") {
                console.log("You find yourself in a forest");
                console.log("There is a wolf in front of you; a friendly looking dwarf to the right and an impasse to the left.");
                this._encounter1();
            } else {
                console.log("You cannot go that way. Try again");
                this._exitHouse();
            }
        });
    },
    _encounter1() {
        adone.runtime.term.prompt().run(this.directionsPrompt).then((answers) => {
            const direction = answers.direction;
            if (direction === "Forward") {
                console.log("You attempt to fight the wolf");
                console.log("Theres a stick and some stones lying around you could use as a weapon");
                this._encounter2b();
            } else if (direction === "Right") {
                console.log("You befriend the dwarf");
                console.log("He helps you kill the wolf. You can now move forward");
                this._encounter2a();
            } else {
                console.log("You cannot go that way");
                this._encounter1();
            }
        });
    },
    _encounter2a() {
        adone.runtime.term.prompt().run(this.directionsPrompt).then((answers) => {
            const direction = answers.direction;
            if (direction === "Forward") {
                let output = "You find a painted wooden sign that says:";
                output += " \n";
                output += " ____  _____  ____  _____ \n";
                output += "(_  _)(  _  )(  _ \\(  _  ) \n";
                output += "  )(   )(_)(  )(_) ))(_)(  \n";
                output += " (__) (_____)(____/(_____) \n";
                console.log(output);
            } else {
                console.log("You cannot go that way");
                this._encounter2a();
            }
        });
    },
    _encounter2b() {
        adone.runtime.term.prompt().run({
            type: "list",
            name: "weapon",
            message: "Pick one",
            choices: [
                "Use the stick",
                "Grab a large rock",
                "Try and make a run for it",
                "Attack the wolf unarmed"
            ]
        }).then(() => {
            console.log("The wolf mauls you. You die. The end.");
        });
    }
});
