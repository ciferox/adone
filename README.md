<div align="center">
  <a href="https://adone.io/dist"><img src="https://adone.io/logo.svg" width="200px"></a>
  <h1>ADONE</h1>
  <p>the generalized core of 'cyber-fractal systems' infrastructure</p>
</div>

_Note: Project is in active development and not production ready yet._

**ADONE** (**AllDONE**) is a multpurpose Node.js-platform, consisting of:
- **Glosses** - constantly developing library code, divided into namespaces.
- **FAST** (Filesystem Automation Streaming Templates/Transforms) - gulp-like streaming system, extended through transfroms (vinyl-streams).
- **Shani** - A full-featured BDD/TDD testing framework.
- **Omnitron** - service-oriented execution environment, with [netron](https://github.com/ciferox/adone-npm) as the core.
- **Cli** - common cli-utility, extendable through [cli-]subsystems.

**ADONE** embodies most of the Agile and DevOps ideas, and can be used in all cycles of developing Node.js-projects and not only (design, development, testing, automation, balancing, monitoring, maintenance, etc.).

**ADONE** is an attempt to implement the concept of [fractality](http://www.fractal.org/Fractal-Systems.htm) with the assumed topology:

<p align="center"><img src="https://adone.io/diagram.png" align="center"></p>

## Installation

### Linux, MacOS, FreeBSD

Download and install `avm`:

    $ curl -L https://adone.io/dist/avm.sh | sudo bash -s install
    
Install **ADONE**:
    
    $ sudo avm adone install latest

Update existing **ADONE**:

    $ sudo avm adone update

You can read more at [avm](https://github.com/ciferox/avm) page.

### Windows

Not ready yet.

## Usage

**ADONE CLI** is a built-in command-line utility, the functionality of which extended through subsystems. **ADONE** comes with following subsystems:

- **project** - command interface for initializing, building and deploying projects.
- **shani** - command interface for running tests.
- **bench** - command interface for benchmarking.
- **omnitron** - command interface for Omnitron.

**ADONE CLI** has detailed help for each subsystem and sub-commands:

    $ adone --help
    $ adone <command> --help
    $ adone <command> <subcommand> [<subsubcommand>, ...] --help

To create a simple adone-script run:

    $ adone project generate miniapp <name>

If you want the script immediately open in your favorite editor, then you can use the `--editor` option:

    $ adone project generate miniapp <filename> --editor 'code -n'

This will create adone mini-appliation, run it using:

    $ adone ./<filename>

_Note: You can use any ES6/ES7 features, adone automatically transpile code and run it._

To initialize adone web-application with **angular4** as frontend and **netron** as backend communication engine, use:

    $ sudo npm i -g @angular/cli@latest
    $ adone project new webapplication <project_name> --frontend ng --netron --editor 'code -n'
    $ cd <project_name>

Read instructions in the generated project's README.md.

## Features

- Latest features of JavaScript (ES6, ES7, ...).
- High quality managable code as the result of automated testing and a strict coding standard (which assumes that the developer must understand what he is doing).
- Maximum performance and lack of code redundancy due to lack of npm-dependencies and built-in lazify-mechanism.
- High stability and fault tolerance due to the use of its own executive ecosystem.
- Adaptability expressed through the ability to scale and ease maintenance.
- Strict system hierarchy and the existence of self-similarity at all levels, implemented through the use of a single code base, the same paradigms and same architectural principles.
- Multipurpose use (WEB, IoT, Rototics, Automation, ...).

## What about ADONE codebase and third-party code?

One of the primary goal of **ADONE** is self-sufficiency and full support of JavaScript `async/await` and other ES-features. We want **ADONE** to be the most complete and strongest codebase, using which you can develop absolutely any projects. We abandoned third-party dependencies and the use of npm-ecosystem for the following reasons:
- Lack of a common coding standard in different modules.
- Most of the code is written using old JavaScript features.
- Many projects are not supported by the authors properly and in accordance with the requirements that we constantly improve.
- Redundancy of the npm-ecosystem through long chains of dependencies between projects.
- Many libraries of the same type gives rise to uncertainty in the choice of a tool for solving a problem.
- Lack of control, which is required to achieve our goals within the project.
- Insufficient control of the security of npm-modules, which can lead to disastrous consequences in any kind of environment.

Therefore, in most cases, instead of developing from scratch we carefully select the code from existing Node.js projects that are written by talented developers and great teams and therefore satisfy the highest standards of quality and performance. On the one hand this is a very meaningless work, but on the other hand we carefully analyse and make serious refactoring of the code. Often we detect errors, fix them and add more tests. Some code remains API-compatible, some partially, and in some cases we completely reimplement codebase.

We are not crazy - we are perfectionists.

## Production ready report

### Glosses

| Namespace | Description | Status | Docs |
| - | - | - | - |
adone | Common namespace | Ready | - |
application | Reusable application framework (adone-applications entry point) | Ready (maintenance, need feedback) | - |
archive | Implementation of archivers | Ready (maintenance, need feedback) | - |
assertion | Implementation of assertion utilites | Stable | - |
collection | Implementation of common collections | Ready (maintenance, need feedback) | - |
compressor | Implementation of different compressors | Ready (maintenance, need feedback) | - |
configuration | Implementation of configurations | Ready (maintenance, need feedback) | - |
core | Implementation of async streaming system and common transforms | Ready (maintenance, need feedback) | - |
crypto | Cryptography stuff | In-progress | - |
cui | Console UI | In-progress | - |
data | Implementation of common data serializers | Ready (maintenance, need feedback) | - |
database | Databases stuff | Ready (maintenance, need feedback) | - |
datetime | Datetime stuff | Stable | - |
diff | Diff stuff | Stable | - |
fast | Implementation of Filesystem Automation Streaming Templates/Transforms | Ready (maintenance, need feedback) | - |
fs | Fily system stuff | Stable | - |
geoip | Geoip stuff | Ready (maintenance, need feedback) | - |
hardware | Hardware (IoT) stuff | In-progress | - |
is | Implementation of predicates | Stable | - |
js | JS compiler (babel) | Stable | - |
math | Math stuff | In-progress | - |
meta | Meta stuff (most of code for internal purposes) | In-progress | - |
metrics | Utilites for obtaining different system & hardware metrics | In-progress | - |
native | Node.js C++ addons | Ready (need refactoring) | - |
net | Network stuff | Ready (maintenance, need feedback) | - |
netron | Implementation of Netron | Ready (maintenance, need feedback) | - |
netscan | Network scanning stuff | In-progress | - |
notifier | System notifier | Ready (maintenance, need feedback) | - |
omnitron | Implementation of Omnitron | In-progress | - |
promise | Useful promise utilites | Stable | - |
punycode | Implementation of Punycode | Stable | - |
regex | Coomon regular expressions | Stable | - |
schema | JSON schema validation | Ready (maintenance, need feedback) | - |
semver | Implementation of semver | Ready (need refactoring) | - |
shani | Implementation of a full-featured BDD/TDD testing framework | Stable | - |
shell | Shell-utilites | In-progress | - |
sourcemap | Implementation of sourcemaps | Stable | - |
specter | Unified system for IT automation | In-progress | - |
std | Assigned Node.JS standard modules | Stable | - |
stream | Streams stuff | In-progress | - |
system | Some system utilites (exec, shell, ...) | In-progress | - |
templating | Templating engines | Ready (maintenance, need feedback) | - |
terminal | Common terminal stuff | Ready (need refactoring & feedback) | - |
text | Implementation of common text-transformation utilites | Ready (maintenance, need feedback) | - |
timing | Timings and perfomance counting  | In-progress | - |
util | Implementation of common utilites | Ready (maintenance, need feedback) | - |
vault | Implementation of vaults | Ready (maintenance, need feedback) | - |
vcs | VCS clients (git, ...) | Ready (maintenance, need feedback) | - |
vendor | Third-party libraries (lodash, banchmark.js, ...) | Stable | - |
virt | Virtualization stuff | In-progress | - |
x | Common exceptions | Stable | - |

### Omnitron

| Context | Description | Status | Docs |
| - | - | - | - |
| db | Simple datastore | In-progress | - |
| pm | Feature-rich Process Manager | In-progress | - |
| auth | Simple Authorization Management  | In-progress | - |
| tm | Feature-rich Task Manager | In-progress | - | - |
| shell | Remote shell | In-progress | - |
| hardware | Hardware metrics | In-progress | - |
| system | System metrics | In-progress | - |
| vaults | Vaults management | In-progress | - |


### Cli

| Subsystem | Description | Status | Docs |
| - | - | - | - |
| project | Command line interface for project managent | In-progress | - |
| omnitron | Command line interface for Omnitron | In-progress | - |
| shani | Command line interface for Shani | Ready (maintenance, need feedback) | - |
| bench | Command line interface for benchmarking | Ready (maintenance, need feedback) | - | - |
