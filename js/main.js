function buildGroup(group) {
  $( "#badges" ).append('<ul class="list-group row">');

  $.each( group.pipelines, function(i , val) {
    btn_class = val.instances[0].latest_stage_state == 'Passed' ? 'btn-success' : 'btn-danger';
    $( "#badges" ).append('<li class="list-group-item col-xs-6"><button type="button" class="btn btn-lg ' + btn_class + '">' + val.name + '</button></li>')
  });

  $( "#badges" ).append('<ul class="list-group row">');
}

$.getJSON( "http://10.0.32.27/go/dashboard.json", function( data ) {
  $.each( data, function(i , val) {
    buildGroup(val);
  });

//  $('#badges').freetile(({
//   animate: true,
//    elementDelay: 3
//  }));
});
