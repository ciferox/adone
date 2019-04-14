require("adone");

// just be silly with calling these functions a bunch
// mostly just to get coverage of the guard branches
const { onExit } = adone.process;
onExit.load();
onExit.load();
onExit.unload();
onExit.unload();
