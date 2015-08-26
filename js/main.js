BUILD_STATE_BUTTON_CLASSES = {
  'Passed': 'btn-success',
  'Building': 'btn-warning',
  'Failed': 'btn-danger'
  }

function buildGroup(group) {
  $.each( group.pipelines, function(i , val) {
    btn_class = BUILD_STATE_BUTTON_CLASSES[val.instances[0].latest_stage_state];
    link = 'http://' + query.server + '/go/tab/pipeline/history/' + val.name;
    $( "#badges" ).append('<li class="col-xs-6"><a href="' + link + '" target="_blank" class="btn btn-lg ' + btn_class + '">' + val.name + '</button></li>')
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
group = query.group ? _.trim(query.group, '/' ) : config.group ? config.group : null;
url = server + "/go/dashboard.json"

$.ajax({
  dataType: "json",
  url: url,
  timeout: 2000
}).done(function( data ) {
  if ( group ) {
    group_object = _.find(data, { 'name': group } )
    if ( typeof group_object !== 'undefined' ) {
      buildGroup( group_object );
    } else {
      error_html = "Pipeline group '" + group + "' was not found in the data returned from " + url
      $( '#error-text' ).html( error_html );
      $( '#error-panel' ).toggle();
    }
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
