# ADONE: the generalized core of 'cyber-fractal systems' infrastructure

_Note: Project now is in active development and not production ready._

<p align="center"><a href="https://adone.io/dist"><img src="https://adone.io/logo.svg" width="150px" align="center"></a></p>

**ADONE** (**AllDONE**) is a multpurpose Node.js-platform, consisting of:
- **Glosses** - constantly developing library code, divided into namespaces, which provides a complete multi-purpose Node.js-framework.
- **FAST** (Filesystem Automation Streaming Templates/Transforms) - gulp-like streaming system, extended through transfroms (vinyl-streams).
- **Shani** - A full-featured BDD/TDD testing framework.
- **Omnitron** - service-oriented execution environment, with [netron](https://github.com/ciferox/adone-npm) as the core.
- **Cli** - common cli-utility, extendable through [cli-]subsystems.

**ADONE** embodies most of the Agile and DevOps ideas, and can be used in all cycles of developing Node.js-projects and not only (design, development, testing, automation, balancing, monitoring, maintenance, etc.).

**ADONE** is an attempt to implement the concept of [fractality](http://www.fractal.org/Fractal-Systems.htm) with the assumed topology:

<p align="center"><img src="https://adone.io/diagram.png" align="center"></p>

## Installation

Download and install `avm`:

    $ curl -L https://adone.io/dist/avm.sh | sudo bash -s install
    
Install **ADONE**:
    
    $ amv adone install latest

You can read more at [avm](https://github.com/ciferox/avm) page.

## Features

- Latest features of JavaScript (ES6, ES7, ...).
- High quality managable code as the result of automated testing and a strict coding standard (which assumes that the developer must understand what he is doing).
- Maximum performance and lack of code redundancy due to lack of npm-dependencies and built-in lazify-mechanism.
- High stability and fault tolerance due to the use of its own executive ecosystem.
- Adaptability expressed through the ability to scale and ease maintenance.
- Strict system hierarchy and the existence of self-similarity at all levels, implemented through the use of a single code base, the same paradigms and same architectural principles.
- Multipurpose use (WEB, IoT, Rototics, Automation, ...).

## What about ADONE codebase and third-party code?

One of the primary goal of **ADONE** is self-sufficiency and full support of JavaScript `async/await` feature. We want **ADONE** to be the most complete codebase, using which you can develop absolutely any projects We abandoned third-party dependencies and the use of npm-ecosystem for the following reasons:
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
application | Reusable application framework (adone-applications entry point) | In-progress | - |
archive | Implementation of archivers | In-progress | - |
assertion | Implementation of assertion utilites | In-progress | - |
collection | Implementation of common collections | In-progress | - |
compressor | Implementation of different compressors | In-progress | - |
configuration | Implementation of configurations | In-progress | - |
core | Implementation of async streaming system and common transforms | In-progress | - |
crypto | Cryptography stuff | In-progress | - |
cui | Console UI | In-progress | - |
data | Implementation of common data serializers | In-progress | - |
database | Databases stuff | In-progress | - |
datetime | Datetime stuff | In-progress | - |
diff | Diff stuff | In-progress | - |
fast | Implementation of Filesystem Automation Streaming Templates/Transforms | In-progress | - |
fs | Fily system stuff | In-progress | - |
geoip | Geoip stuff | In-progress | - |
hardware | Hardware (IoT) stuff | In-progress | - |
is | Implementation of predicates | In-progress | - |
js | JS compiler (babel) | In-progress | - |
math | Math stuff | In-progress | - |
meta | Meta stuff (most of code for internal purposes) | In-progress | - |
metrics | Utilites for obtaining different system & hardware metrics | In-progress | - |
native | Node.js C++ addons | In-progress | - |
net | Network stuff | In-progress | - |
netron | Implementation of Netron | In-progress | - |
netscan | Network scanning stuff | In-progress | - |
notifier | System notifier | In-progress | - |
omnitron | Implementation of Omnitron | In-progress | - |
promise | Useful promise utilites | In-progress | - |
punycode | Implementation of Punycode | In-progress | - |
regex | Coomon regular expressions | In-progress | - |
schema | JSON schema validation | In-progress | - |
semver | Implementation of semver | In-progress | - |
shani | Implementation of a full-featured BDD/TDD testing framework | In-progress | - |
shell | Shell-utilites | In-progress | - |
sourcemap | Implementation of sourcemaps | In-progress | - |
specter | Unified system for IT automation | In-progress | - |
std | Assigned Node.JS standard modules | In-progress | - |
stream | Streams stuff | In-progress | - |
system | Some system utilites (exec, shell, ...) | In-progress | - |
templating | Templating engines | In-progress | - |
terminal | Common terminal stuff | In-progress | - |
text | Implementation of common text-transformation utilites | In-progress | - |
timing | Timings and perfomance counting  | In-progress | - |
util | Implementation of common utilites | In-progress | - |
vault | Implementation of vaults | In-progress | - |
vcs | VCS clients (git, ...) | In-progress | - |
vendor | Third-party libraries (lodash, banchmark.js, ...) | In-progress | - |
virt | Virtualization stuff | In-progress | - |
x | Common exceptions | In-progress | - |

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
