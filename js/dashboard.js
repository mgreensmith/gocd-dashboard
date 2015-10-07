BUILD_STATE_LABEL_CLASSES = {
  'Passed': 'label-success',
  'Building': 'label-warning',
  'Failed': 'label-danger',
  'Cancelled': 'label-default'
}

BUILD_STATE_TEXT_CLASSES = {
  'Passed': 'text-success',
  'Building': 'text-warning',
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

function loadPipelineData( reloading ) {
  $.ajax({
    dataType: "json",
    url: dashboardUrl,
    timeout: 2000
  }).done(function(data) {
    $.each(data, function(i, val) {
      if ( reloading ) {
        reloadPipelineGroup(val);
      } else {
        populatePipelineGroup(val);
      }
    });

    loadTooltips();
    attachCollapse();

  }).fail(function(jqxhr, textStatus, error) {
    handleError(error);
  });
}

function populatePipelineGroup(group) {
  $("#pipeline-groups").append(pipeline_group_template({
    name: group.name
  }))
  $.each(group.pipelines, function(i, pipeline) {

    $("#pipeline-group-" + group.name).append("<tr id='" + pipeline.name + "-pipeline'>" + pipeline_badge_template(pipelineData(pipeline)) + "</tr>")
  });
}

function reloadPipelineGroup(group) {
  $.each(group.pipelines, function(i, pipeline) {
    $("#" + pipeline.name + '-pipeline').html(pipeline_badge_template(pipelineData(pipeline)))
  });
}

function pipelineData(pipeline) {
  pipeline.is_building = pipeline.instances[0].latest_stage_state == 'Building' ? true : false
  if (pipeline.instances[0]) {
    pipeline.instances[0].latest_stage_state_text_class = BUILD_STATE_TEXT_CLASSES[pipeline.instances[0].latest_stage_state]
    $.each(pipeline.instances[0].stages, function(i, stage) {
      pipeline.instances[0].stages[i].status_label_class = BUILD_STATE_LABEL_CLASSES[stage.status]
    });
  }

  return pipeline;
}

function cancelUrl( buildLocator ) {
  // buildLocator: cozy-payments-develop/145/tests/1/rspec
  parts = buildLocator.split('/');

  // POST /go/api/stages/:pipeline_name/:stage_name/cancel
  return '/go/api/stages/' + parts[0] + '/' + parts[2] + '/cancel'
}


function loadJobData() {

  $.ajax({
    dataType: "xml",
    url: jobsUrl,
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

  }).fail(function(jqxhr, textStatus, error) {
    handleError(error);
  });
}

function loadAgentData() {

  $.ajax({
    dataType: "json",
    url: agentsUrl,
    timeout: 2000
  }).done(function(data) {
    $('#agents').html('');

    $.each(data, function(i, agent) {

      agent_hash = {
        'agent_name': agent.agent_name,
        'status_label_class': AGENT_STATUS_LABEL_CLASSES[agent.status],
        'status': agent.status
      }

      if ( agent.status == 'Building' ) {
        agent_hash['build_url'] = server + '/go/tab/build/detail/' + agent.build_locator
        agent_hash['build_name'] = agent.build_locator
        agent_hash['cancel_url'] = cancelUrl( agent.build_locator )
      }

      $('#agents').append( agent_template( agent_hash ));
    });

  }).fail(function(jqxhr, textStatus, error) {
    handleError(error);
  });
}

function handleError(error) {

  if (error) {
    error_html = "Error: " + error
  } else {
    error_html = "An unknown error occurred."
  }

  $('#error-text').html(error_html + '<br>');
  $('#error-panel').show();
}

function hoverGetData() {
  var element = $(this);

  var url = element.data('url');
  var localData = "error";

  $.ajax(server + url, {
    async: false,
    success: function(data) {
      localData = data;
    }
  });

  return localData;
}

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

function showPauseModal(name, url) {
  $("#pause-modal-title").text("Pause pipeline " + name);
  $("#pause-modal-form-pausecause").val('');
  $('#pause-modal-submit-button').attr('onclick', "pausePipeline('" + url + "', $('#pause-modal-form-pausecause').val())")
  $('#pause-modal').modal('show');
}

function pausePipeline(url, cause) {
  $('#pause-modal').modal('hide');
  $.post( server + url, { pauseCause: cause })
    .done(function( data ) {
      loadPipelineData( true );
    });
}

function unpausePipeline(url) {
  $.post( server + url )
    .done(function( data ) {
      loadPipelineData( true );
    });
}

function cancelStage(url) {
  $.post( server + url )
    .done(function( data ) {
      loadPipelineData( true );
      loadJobData();
      loadAgentData();
    });
}

function schedulePipeline(url) {
  $.post( server + url )
    .done(function( data ) {
      setTimeout(function() {
        loadPipelineData( true );
      }, 3000);
    });
}

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

$(document).ready(function(){

  pipeline_group_template = Handlebars.compile($("#pipeline-group-template").html());
  pipeline_badge_template = Handlebars.compile($("#pipeline-badge-template").html());
  scheduled_job_template = Handlebars.compile($("#scheduled-job-template").html());
  agent_template = Handlebars.compile($("#agent-template").html());

  Handlebars.registerHelper('reldate', function(epoch) {
    return moment(epoch).fromNow();
  });


  server = config.server;
  dashboardUrl = server + "/go/dashboard.json";
  jobsUrl = server + "/go/api/jobs/scheduled.xml";
  agentsUrl = server + "/go/api/agents";

  loadPipelineData( false );
  loadAgentData();
  loadJobData();
  setInterval(function() {loadPipelineData( true ); }, 5000);
  setInterval(function() {loadAgentData(); }, 5000);
  setInterval(function() {loadJobData(); }, 5000);

});
