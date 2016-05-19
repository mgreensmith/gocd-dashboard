# GoCD Dashboard

This is an alternative dashboard for [GoCD](http://go.cd). It mimics the Jenkins dashboard view.

![Screenshot](/screenshot.png?raw=true)

### Features

- Detail view of all pipelines in all groups, groups are collapsible
- Schedule/pause/unpause any pipeline
- Detail view of all agents, with build status
- Cancel any stage that is scheduled or building
- List of all queued jobs
- Auto-refreshes all data from server

### Requirements

- GoCD server version `15.3` or newer. (Use branch `pre-15.3-compat` for GoCD version 15.1 or 15.2 compatibility.)
- A webserver

### Usage

1. Modify `js/config.js` as necessary.
2. Serve this directory with the webserver of your choice.

### Configuration

Default configuration values are sourced from `js/config.js`.

- `server`: URL to your GoCD server.

### Copyright

Copyright (c) 2015 Matt Greensmith

This project is licensed under the terms of the [MIT license](/LICENSE.txt).
