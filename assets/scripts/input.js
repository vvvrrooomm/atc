
function input_init_pre() {
  prop.input={};

  prop.input.command  = "";
  prop.input.callsign = "";
  prop.input.data     = "";

  prop.input.history      = [];
  prop.input.history_item = null;

  prop.input.click    = [0, 0];

  prop.input.positions = "";
}

function input_init() {

  $(window).keydown(function(e) {
    if(e.which == 27) {
      if(prop.tutorial.open) tutorial_close();
      else if($("#airport-switch").hasClass("open")) ui_airport_close();
    }
    if(!prop.tutorial.open) return;
    if(e.which == 33) {
      tutorial_prev()
      e.preventDefault();
    } else if(e.which == 34) {
      tutorial_next()
      e.preventDefault();
    }
  });

  $("#canvases").mousemove(function(e) {
    var position = [e.pageX, -e.pageY];
    position[0] -= prop.canvas.size.width / 2;
    position[1] += prop.canvas.size.height / 2;
    prop.input.click = [pixels_to_km(position[0]), pixels_to_km(position[1])];
  });

  $("#canvases").mousedown(function(e) {
    var position = [e.pageX, -e.pageY];
    position[0] -= prop.canvas.size.width / 2;
    position[1] += prop.canvas.size.height / 2;
    var nearest = aircraft_get_nearest([pixels_to_km(position[0]), pixels_to_km(position[1])]);
    if(nearest[0]) {
      if(nearest[1] < pixels_to_km(80)) {
        input_select(nearest[0].getCallsign().toUpperCase());
      } else {
        input_select();
      }
    }
    position = [pixels_to_km(position[0]), pixels_to_km(position[1])];
    position[0] = parseFloat(position[0].toFixed(2));
    position[1] = parseFloat(position[1].toFixed(2));
    prop.input.positions += "["+position.join(",")+"]";
    e.preventDefault();
    return(false);
  });

  $(window).keydown(function() {
    if(!game_paused())
      $("#command").focus();
  });

  $("#command").keydown(input_keydown);
  $("#command").on("input", input_change);
}

function input_complete() {
  return;
  $("#command").val(prop.aircraft.list[0].getCallsign() + " turn left 130 turn right 213 climb 43");
  input_change();
  input_run();
}

function input_select(callsign) {
  if(callsign) $("#command").val(callsign + " ");
  else $("#command").val("");
  $("#command").focus();
  input_change();
}

function input_change() {
  var value = $("#command").val();
  prop.input.command = value;
  input_parse();
}

function input_parse() {
  $(".strip").removeClass("active");
  prop.input.callsign = "";
  prop.input.data     = "";

  var c = prop.input.command;
  var i;
  var skip=false;
  var data=false;

  for(i=0;i<c.length;i++) {
    if(c[i] == " " && prop.input.data.length == 0 && prop.input.callsign.length != 0) {
      skip=true;
    }
    if(skip && c[i] != " ") {
      skip=false;
      data=true;
    }
    if(!skip) {
      if(data) prop.input.data += c[i].toLowerCase();
      else prop.input.callsign += c[i].toLowerCase();
    }
  }

  if(prop.input.callsign.length == 0) return;

  var number = 0;
  var match  = null;

  for(var i=0;i<prop.aircraft.list.length;i++) {
    var aircraft=prop.aircraft.list[i];
    if(aircraft.matchCallsign(prop.input.callsign)) {
      number += 1;
      match = aircraft;
      aircraft.html.addClass("active");
    }
  }
  if(number == 1) {
//    $("#sidebar").scrollTop(round(match.html.position().top + ($(window).height() / 3)));
  }
}

function input_keydown(e) {
  if(e.which == 13) { // enter key
    console.log('you hit enter');
    input_parse();
    if(input_run()) {
      prop.input.history.unshift(prop.input.callsign);
      $("#command").val("");
      prop.input.command = "";
      input_parse();
    }
    prop.input.history_item = null;
  } else if(e.which == 38) {
    console.log('you hit the up arrow');
    input_history_prev();
    e.preventDefault();
  } else if(e.which == 40) {
    console.log('you hit the down arrow');
    input_history_next();
    e.preventDefault();
  }
}

function input_history_clamp() {
  prop.input.history_item = clamp(0, prop.input.history_item, prop.input.history.length-1);
}

function input_history_prev() {
  if(prop.input.history.length == 0) return;
  if(prop.input.history_item == null) {
    prop.input.history.unshift(prop.input.command);
    prop.input.history_item = 0;
  }

  prop.input.history_item += 1;
  input_history_clamp();

  var command = prop.input.history[prop.input.history_item] + ' ';
  $("#command").val(command);
  input_change();
}

function input_history_next() {
  if(prop.input.history.length == 0) return;
  if(prop.input.history_item == null) return;

  prop.input.history_item -= 1;

  if(prop.input.history_item <= 0){
    $("#command").val(prop.input.history[0]);
    input_change();
    prop.input.history.splice(0, 1);
    prop.input.history_item = null;
    return;
  }

  input_history_clamp();

  var command = prop.input.history[prop.input.history_item];
  $("#command").val(command);
  input_change();
}

function input_run() {
  if(prop.input.callsign == "version") {
    ui_log("Air Traffic Control simulator version " + prop.version.join("."));
    return true;
  } else if(prop.input.callsign == "tutorial") {
    tutorial_toggle();
    return true;
  } else if(prop.input.callsign == "pause") {
    game_pause_toggle();
    return true;
  } else if(prop.input.callsign == "timewarp") {
    if(prop.input.data) {
      prop.game.speedup = parseInt(prop.input.data);
    } else {
      game_timewarp_toggle();
    }
    return true;
  } else if(prop.input.callsign == "clear") {
    localStorage.clear();
    location.reload();
  } else if(prop.input.callsign == "airport") {
    if(prop.input.data) {
      if(prop.input.data.toLowerCase() in prop.airport.airports) {
        airport_set(prop.input.data);
      } else {
        ui_airport_toggle();
      }
    } else {
      ui_airport_toggle();
    }
    return true;
  }

  var matches = 0;
  var match   = -1;

  for(var i=0;i<prop.aircraft.list.length;i++) {
    var aircraft=prop.aircraft.list[i];
    if(aircraft.matchCallsign(prop.input.callsign)) {
      matches += 1;
      match    = i;
    }
  }

  if(matches > 1) {
    ui_log("multiple aircraft match the callsign, say again");
    return true;
  }
  if(match == -1) {
    ui_log("no such aircraft, say again");
    return true;
  }

  var aircraft = prop.aircraft.list[match];
  return aircraft.runCommand(prop.input.data);
}
