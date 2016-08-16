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

- GoCD server version `16.7` or newer.
- A webserver

### Legacy

- GoCD versions 16.3 through 16.6 are untested and may or may not be supported.
- Use branch `pre-16.3-compat` for compatibility with GoCD versions 15.3 through 16.2.
- Use branch `pre-15.3-compat` for compatibility with GoCD versions earlier than 15.3.

### Usage

1. Modify `js/config.js` as necessary.
2. Serve this directory with the webserver of your choice.

### Configuration

Default configuration values are sourced from `js/config.js`.

- `server`: URL to your GoCD server.

### Copyright

Copyright (c) 2015 Matt Greensmith

This project is licensed under the terms of the [MIT license](/LICENSE.txt).
