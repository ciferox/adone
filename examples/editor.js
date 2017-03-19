const { util: { Editor }, std: { readline } } = adone;

const rl = readline.createInterface({
    input: process.stdin,
    output: null
});

const message = "\n\n# Please Write a message\n# Any line starting with # is ignored";

process.stdout.write("Please write a message. (press enter to launch your preferred editor)");

const editor = new Editor({ text: message });

rl.on("line", async () => {
    try {
        rl.pause();
        const response = await editor.run();
        if (response.length === 0) {
            readline.moveCursor(process.stdout, 0, -1);
            process.stdout.write("Your message was empty, please try again. (press enter to launch your preferred editor)");
            rl.resume();
        } else {
            process.stdout.write("Your Message:\n");
            process.stdout.write(response);
            process.stdout.write("\n");
            rl.close();
        }
    } catch (err) {
        process.stderr.write(err.message);
        process.stdout.write("\n");
        rl.close();
    } finally {
        await editor.cleanup();
    }
});
