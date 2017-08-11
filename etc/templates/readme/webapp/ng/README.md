# {{ name }}

This project was generated with [ADONE CLI](https://github.com/ciferox/adone) version {{ adoneVersion }}.

## Frontend development

Backend:

    $ cd backend
    $ adone project watch --build
    $ ./bin/app.js

Frontend:
    
    $ cd frontend
    $ ng serve [--port <preferred_port>] --proxy-config ./proxy.conf.js

Navigate to `http://localhost:4200/` (or your <preferred_port>). The application will automatically reload if you change any of the frontend source files.

But if you change backend source files you should restart it.

## Building

Backend:

    $ cd backend
    $ adone project build

Frontend:

    $ cd frontend
    $ ng build --prod

## Running server

    $ ./backend/bin/app.js