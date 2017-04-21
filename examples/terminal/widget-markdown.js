// import adone from "adone";

const screen = new adone.cui.Screen();
const markdown = new adone.cui.widget.Markdown();

screen.append(markdown);
markdown.setOptions({ firstHeading: adone.terminal.red.italic });
markdown.setMarkdown("# Hello \n This is **markdown** printed in the `terminal` 11");
screen.render();
