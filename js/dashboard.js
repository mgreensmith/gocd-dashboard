BUILD_STATE_LABEL_CLASSES = {
  'Passed': 'label-success',
  'Building': 'label-warning',
  'Failing': 'label-warning',
  'Failed': 'label-danger',
  'Cancelled': 'label-default'
}

BUILD_STATE_TEXT_CLASSES = {
  'Passed': 'text-success',
  'Building': 'text-warning',
  'Failing': 'text-warning',
  'Failed': 'text-danger',
  'Cancelled': 'text-default'
}

AGENT_STATUS_LABEL_CLASSES = {
  'Pending': 'label-default',
  'LostContact': 'label-danger',
  'Missing': 'label-danger',
  'Building': 'label-warning',
  'Cancelled': 'label-primary',
  'Idle': 'label-primary',
  'Disabled': 'label-default'
}

// Fetch dashboard.json and populate the pipelines table.
function loadPipelineData( reloading ) {
  $.ajax({
    dataType: "json",
    url: server + "/go/api/dashboard",
    timeout: 2000,
    headers: {
      Accept : "application/vnd.go.cd.v1+json"
    }
  }).done(function(data) {
    $.each(data._embedded.pipeline_groups, function(i, pipeline_group) {
      if ( reloading ) {
        reloadPipelineGroup(pipeline_group);
      } else {
        populatePipelineGroup(pipeline_group);
      }
    });
    // reattach event listeners to new elements
    loadTooltips();
    attachCollapse();
  });
}

// Populate a pipeline group into new rows in the pipelines table
function populatePipelineGroup(group) {
  $("#pipeline-groups").append(pipeline_group_template({
    name: group.name
  }))
  $.each(group._embedded.pipelines, function(i, pipeline) {
    $("#pipeline-group-" + group.name).append("<tr id='" + pipeline.name + "-pipeline'>" + pipeline_badge_template(pipelineData(pipeline)) + "</tr>")
  });
}

// Reload the existing pipeline table rows with fresh data
function reloadPipelineGroup(group) {
  $.each(group._embedded.pipelines, function(i, pipeline) {
    $("#" + pipeline.name + '-pipeline').html(pipeline_badge_template(pipelineData(pipeline)))
  });
}

function stageIsBuilding(element, index, array) {
  return element.status == 'Building';
}

// Accept a pipeline object from the API and add some additional attributes
// for element classes, returning the embiggened object.
function pipelineData(pipeline) {
  if (pipeline._embedded.instances[0]) {
    pipeline.is_building = pipeline._embedded.instances[0]._embedded.stages.some(stageIsBuilding);// ? true : false
    pipeline._embedded.instances[0].latest_stage_state_text_class = BUILD_STATE_TEXT_CLASSES[pipeline._embedded.instances[0]._embedded.stages[0].status]
    $.each(pipeline._embedded.instances[0]._embedded.stages, function(i, stage) {
      pipeline._embedded.instances[0]._embedded.stages[i].status_label_class = BUILD_STATE_LABEL_CLASSES[stage.status]
      // Take the href for the stage which is an API URL, split it on /stages/ and prepend /go/pipelines
      pipeline._embedded.instances[0]._embedded.stages[i].url = '/go/pipelines/' + pipeline._embedded.instances[0]._embedded.stages[i]._links.self.href.split('/stages/')[1]
    });
  }
  pipeline.history_url = '/go/tab/pipeline/history/' + pipeline.name
  return pipeline;
}

// Given a build-locator string, construct an URL that would cancel that stage
function cancelUrl( buildLocator ) {
  // buildLocator: cozy-payments-develop/145/tests/1/rspec
  parts = buildLocator.split('/');

  // POST /go/api/stages/:pipeline_name/:stage_name/cancel
  return '/go/api/stages/' + parts[0] + '/' + parts[2] + '/cancel'
}

// Fetch scheduled job data from the API and populate the scheduled jobs table
function loadJobData() {
  $.ajax({
    dataType: "xml",
    url: server + "/go/api/jobs/scheduled.xml",
    timeout: 2000
  }).done(function(data) {
    $('#scheduled-jobs').html('');

    $(data).find('job').each(function() {
      job_hash = {
        'name': $(this).find('buildLocator').text(),
        'url': $(this).find('link').attr('href'),
        'cancel_url': cancelUrl( $(this).find('buildLocator').text() )
      }
      $('#scheduled-jobs').append( scheduled_job_template( job_hash ))
    });
  });
}

// Fetch agent data from the agents API, and populate the agents table
function loadAgentData() {
  $.ajax({
    dataType: "json",
    url: server + "/go/api/agents",
    timeout: 2000
  }).done(function(data) {
    $('#agents').html('');

    $.each(data, function(i, agent) {

      agent_hash = {
        'agent_name': agent.agent_name,
        'agent_ip_address': agent.ip_address,
        'agent_os': agent.os,
        'status_label_class': AGENT_STATUS_LABEL_CLASSES[agent.status],
        'status': agent.status,
        'agent_environments': agent.environments
      }

      if ( agent.status == 'Building' ) {
        agent_hash['build_url'] = '/go/tab/build/detail/' + agent.build_locator
        agent_hash['build_time'] = getElapsedBuildTime( agent.build_locator )
        agent_hash['build_name'] = agent.build_locator
        agent_hash['cancel_url'] = cancelUrl( agent.build_locator )
      }

      $('#agents').append( agent_template( agent_hash ));
    });
  });
}

// Given a build-locator, determine the stage instance API url for this stage,
// fetch data about the current instance, find the time that the build started.
// Calculate the duration from build-start to now, and return a formatted string.
function getElapsedBuildTime( buildLocator ) {
  // buildLocator: cozy-payments-develop/145/tests/1/rspec
  parts = buildLocator.split('/');
  job_name = parts[4];

  // /go/api/stages/:pipeline_name/:stage_name/instance/:pipeline_counter/:stage_counter
  url = server + '/go/api/stages/' + parts[0] + '/' + parts[2] + '/instance/' + parts[1] + '/' + parts[3]

  startTime = "unknown";

  $.ajax(url, {
    async: false,
    success: function(data) {
      $.each(data.jobs, function(i, job) {
        if ( job.name == job_name ) {
          if ( job.job_state_transitions[3] ) {
            startTime = job.job_state_transitions[3].state_change_time; // the 4th transition element is Preparing -> Building transition
          }
        }
      });
    }
  });

  if ( startTime != 'unknown' ) {
    d = moment.duration(moment(Date.now()).diff(startTime));
    return d.hours() + 'h ' + d.minutes() + 'm ' + d.seconds() + 's';
  } else {
    return 'unknown duration'
  }
}

// Return the results of an AJAX call to the URL from the 'data-url'
// attribute of the calling DOM element. Used by hover-tooltip elements.
function hoverGetData() {
  element = $(this);

  localData = "error";

  $.ajax(element.data('url'), {
    async: false,
    success: function(data) {
      localData = data;
    }
  });

  return localData;
}

// Populate tooltips from the API for all 'hover-tooltip' elements.
function loadTooltips() {
  $('.hover-tooltip').tooltip({
    title: hoverGetData,
    html: true,
    container: 'body',
    placement: 'left',
    delay: {
      "show": 100,
      "hide": 1500
    }
  });
}

// Display the pipeline pause modal and configure its elements
function showPauseModal(name, url) {
  $("#pause-modal-title").text("Pause pipeline " + name);
  $("#pause-modal-form-pausecause").val('');
  $('#pause-modal-submit-button').attr('onclick', "pausePipeline('" + url + "', $('#pause-modal-form-pausecause').val())")
  $('#pause-modal').modal('show');
}

// Handler for the pipeline pause modal button submit action.
function pausePipeline(url, cause) {
  $('#pause-modal').modal('hide');
  postURL(url, { pauseCause: cause });
}

// Given an URL and optional parameters, POST to that URL
// and then reload all dynamic data.
function postURL(url, params) {
  $.post( url, params)
    .done(function( data ) {
      loadPipelineData( true );
      loadJobData();
      loadAgentData();
    });
}

// Attach event handlers to collapsible elements, for maniplulating chevrons
function attachCollapse() {
  $('.collapse').on('shown.bs.collapse', function(){
    chevron = $(this).data('chevron')
    $(chevron).removeClass("glyphicon-chevron-left").addClass("glyphicon-chevron-down");
  });

  $('.collapse').on('hidden.bs.collapse', function(){
    chevron = $(this).data('chevron')
    $(chevron).removeClass("glyphicon-chevron-down").addClass("glyphicon-chevron-left");
  });
}

// Let's do this thing!
$(document).ready(function(){

  pipeline_group_template = Handlebars.compile($("#pipeline-group-template").html());
  pipeline_badge_template = Handlebars.compile($("#pipeline-badge-template").html());
  scheduled_job_template = Handlebars.compile($("#scheduled-job-template").html());
  agent_template = Handlebars.compile($("#agent-template").html());

  Handlebars.registerHelper('reldate', function(epoch) {
    return moment(epoch).fromNow();
  });

  Handlebars.registerHelper('serverUrl', function(url) {
    return server + url;
  });


  server = config.server;

  loadPipelineData( false );
  loadAgentData();
  loadJobData();
  setInterval(function() {loadPipelineData( true ); }, 5000);
  setInterval(function() {loadAgentData(); }, 5000);
  setInterval(function() {loadJobData(); }, 5000);

});
