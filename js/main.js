function buildGroup(group) {
  $.each( group.pipelines, function(i , val) {
    btn_class = val.instances[0].latest_stage_state == 'Passed' ? 'btn-success' : 'btn-danger';
    $( "#badges" ).append('<li class="col-xs-6"><button type="button" class="btn btn-lg ' + btn_class + '">' + val.name + '</button></li>')
  });
}

$.getJSON( "http://10.0.32.27/go/dashboard.json", function( data ) {
  $.each( data, function(i , val) {
    buildGroup(val);
  });
});
