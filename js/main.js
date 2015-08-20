function buildGroup(group) {
  $.each( group.pipelines, function(i , val) {
    btn_class = val.instances[0].latest_stage_state == 'Passed' ? 'btn-success' : 'btn-danger';
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

var query = queryParse( window.location.search );

if ( query.server ) {

  $.getJSON( "http://" + query.server + "/go/dashboard.json", function( data ) {

    //var query = queryParse( window.location.search );

    if ( query.group ) {
      buildGroup( _.find(data, { 'name': _.trim(query.group, '/' ) } ));
    } else {
      $.each( data, function(i , val) {
        buildGroup(val);
      });
    };
  });

} else {
  $('#usage').toggle();
}
