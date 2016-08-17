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

var activeAgents = {};

// Fetch dashboard.json and populate the pipelines table.
function loadPipelineAndAgenData( reloading ) {
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
    // load the agent data after we populate/reload the pipelineGroups
    // so we know which are currently building
    loadAgentData();
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
// If the pipeline is currently building, store some information about the agent
// running it and it's build location
function pipelineData(pipeline) {
  if (pipeline._embedded.instances[0]) {
    pipeline.is_building = pipeline._embedded.instances[0]._embedded.stages.some(stageIsBuilding);// ? true : false
    pipeline._embedded.instances[0].latest_stage_state_text_class = BUILD_STATE_TEXT_CLASSES[pipeline._embedded.instances[0]._embedded.stages[0].status]
    $.each(pipeline._embedded.instances[0]._embedded.stages, function(i, stage) {
      pipeline._embedded.instances[0]._embedded.stages[i].status_label_class = BUILD_STATE_LABEL_CLASSES[stage.status]
      // Take the href for the stage which is an API URL, split it on /stages/ and prepend /go/pipelines
      pipeline._embedded.instances[0]._embedded.stages[i].url = '/go/pipelines/' + pipeline._embedded.instances[0]._embedded.stages[i]._links.self.href.split('/stages/')[1]
      if(pipeline.is_building) {
        storeActiveAgentDetails( pipeline );
      }
    });
  }
  pipeline.history_url = '/go/tab/pipeline/history/' + pipeline.name
  return pipeline;
}

// Gather data from the pipeline object to construct a stage instance API url
function stageInstanceUrl(pipeline) {
  var pipeline_name = pipeline.name;
  var pipeline_counter = pipeline._embedded.instances[0].label;
  var stage_name = pipeline._embedded.instances[0]._embedded.stages[0].name;
  var stage_counter = 1;

  return '/go/api/stages/' + pipeline_name + '/' + stage_name + '/instance/' + pipeline_counter + '/' + stage_counter
}

// Given a pipeline object, fetch the stage instance to retrieve the building
// agent's uuid. Store the build location and stage instance api url in the
// activeAgents hash with agent's uuid as the key
function storeActiveAgentDetails( pipeline ) {
  var build_locator = pipeline._embedded.instances[0]._embedded.stages[0]._links.self.href.split('/stages/')[1];
  $.ajax({
    dataType: "json",
    url: server + stageInstanceUrl( pipeline ),
    timeout: 2000
  }).done(function(data) {
    var agent_uuid = data.jobs[0].agent_uuid;
    activeAgents[agent_uuid] = {buildLocator: build_locator,  stageInstanceUrl: stageInstanceUrl(pipeline) };
  })
}

// Given a buildLocator URL, construct a URL that would cancel that stage
// i.e. /go/api/stages/:pipeline_name/:stage_name/cancel
function cancelUrl( buildLocator ) {
  // buildLocator example: anonymizer/355/anonymize/1/[optional job name]
  parts = buildLocator.split('/');
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
    timeout: 2000,
    headers: {
      Accept : "application/vnd.go.cd.v2+json"
    }
  }).done(function(data) {
    $('#agents').html('');

    $.each(data._embedded.agents, function(i, agent) {

      agent_hash = {
        'agent_name': agent.hostname,
        'agent_ip_address': agent.ip_address,
        'agent_os': agent.operating_system,
        'status_label_class': AGENT_STATUS_LABEL_CLASSES[agent.build_state],
        'status': agent.build_state,
        'agent_environments': agent.environments
      }

      if ( agent.build_state == 'Building' && activeAgents[agent.uuid] ) {
        agent_hash['build_url'] = '/go/pipelines/' + activeAgents[agent.uuid].buildLocator
        agent_hash['build_time'] = getElapsedBuildTime( activeAgents[agent.uuid].stageInstanceUrl )
        agent_hash['build_name'] = activeAgents[agent.uuid].buildLocator
        agent_hash['cancel_url'] = cancelUrl(activeAgents[agent.uuid].buildLocator)
      }

      $('#agents').append( agent_template( agent_hash ));
    });
  });
}

// Given a stage instance API url, fetch data about the instance, and find the
// time that the build started. Calculate the duration from build-start to now,
// and return a formatted string.
function getElapsedBuildTime( stageInstanceUrl ) {
  if(!stageInstanceUrl) {
    return 'unknown duration';
  }

  startTime = "unknown";

  $.ajax({
    datatype: 'json',
    url: server + stageInstanceUrl,
    async: false,
    success: function(data) {
      $.each(data.jobs, function(i, job) {
        if ( job.job_state_transitions[3] ) {
          startTime = job.job_state_transitions[3].state_change_time; // the 4th transition element is Preparing -> Building transition
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
  $.ajax({
    type: 'POST',
    url: url,
    data: params,
    headers: {confirm: true}
  }).done(function( data ) {
    loadPipelineAndAgenData( true );
    loadJobData();
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

  loadPipelineAndAgenData( false );
  loadJobData();
  setInterval(function() {loadPipelineAndAgenData( true ); }, 5000);
  setInterval(function() {loadJobData(); }, 5000);

});
