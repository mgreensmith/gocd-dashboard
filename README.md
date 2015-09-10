# GoCD Wallboard

This is a very minimal visualizer for [GoCD](http://go.cd) pipeline status. It can display the status of all available pipelines or pipelines from a single pipeline group.

![Screenshot](/screenshot.png?raw=true)

### Usage

1. Modify `js/config.js` as necessary.
2. Serve this directory with the webserver of your choice.

### Configuration

Default configuration values are sourced from `js/config.js`.

- `server`: URL to your GoCD server.
- `pipeline_groups`: [optional] comma-separated list of pipeline groups to display. Default: display all pipeline groups.
- `hide_paused_pipelines`: [optional] whether to hide paused pipelines from the wallboard display. Default: false (display paused pipelines).

Configuration values can be overriden at run time via URL query parameters, e.g. `http://gocd-wallboard/?server=http://my.gocdserver.com&pipeline_groups=somegroup,someothergroup`

### Copyright

Copyright (c) 2015 Matt Greensmith

This project is licensed under the terms of the [MIT license](/LICENSE.txt).
