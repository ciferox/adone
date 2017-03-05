// import adone from "adone";
const { terminal } = adone;

const screen = new terminal.Screen();
const markdown = new terminal.widget.Markdown();

screen.append(markdown);
markdown.setOptions({ firstHeading: terminal.style.red.italic });
markdown.setMarkdown("# Hello \n This is **markdown** printed in the `terminal` 11");
screen.render();
