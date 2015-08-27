BUILD_STATE_BUTTON_CLASSES = {
  'Passed': 'btn-success',
  'Building': 'btn-warning',
  'Failed': 'btn-danger'
  }

function buildGroup(group) {
  $( "#pipeline-groups" ).append( pipeline_group_template( { name: group.name } ))

  $.each( group.pipelines, function(i , pipeline) {
    pipeline_details = {
      name: pipeline.name,
      link: server + '/go/tab/pipeline/history/' + pipeline.name,
      btn_class: BUILD_STATE_BUTTON_CLASSES[pipeline.instances[0].latest_stage_state]
    }
    $( "#pipeline-group-" + group.name ).append( pipeline_badge_template( pipeline_details ))
  });
}

function queryParse(querystring) {
  var result = {};
  (querystring || '').replace(
      new RegExp("([^?=&]+)(=([^&]*))?", "g"),
      function($0, $1, $2, $3) {
          result[$1] = $3 !== undefined ? decodeURIComponent($3) : $3;
      }
  );
  return result;
}

query = queryParse( window.location.search );

server = query.server ? _.trim(query.server, '/' ) : _.trim(config.server, '/' );
url = server + "/go/dashboard.json"

if ( query.pipeline_groups ) {
  pipeline_groups =  _.trim(query.pipeline_groups, '/' )
} else {
  pipeline_groups = config.pipeline_groups ? config.pipeline_groups : null
}

groups = pipeline_groups !== null ? pipeline_groups.split(',') : null

pipeline_group_template = Handlebars.compile( $("#pipeline-group-template").html() );
pipeline_badge_template = Handlebars.compile( $("#pipeline-badge-template").html() );

$.ajax({
  dataType: "json",
  url: url,
  timeout: 2000
}).done(function( data ) {
  if ( groups !== undefined && groups !== null ) {
    $.each( groups, function(i , group) {
      group_object = _.find(data, { 'name': group } )
      if ( typeof group_object !== 'undefined' ) {
        buildGroup( group_object );
      } else {
        error_html = "Pipeline group '" + group + "' was not found in the data returned from " + url
        $( '#error-text' ).html( error_html );
        $( '#error-panel' ).toggle();
      }
    });
  } else {
    $.each( data, function(i , val) {
      buildGroup(val);
    });
  };
}).fail(function( jqxhr, textStatus, error ) {
  error_html = "Unable to fetch data from " + url
  if ( error ) {
    error_html = error_html + "<br>Error: " + error
  }
    $( '#error-text' ).html( error_html );
    $( '#error-panel' ).toggle();
});
