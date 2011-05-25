//my human readable name
//can also be specified using #user_name= in the url
var my_name;

//if this is false it just ignores strophe
//you can still browse and search the data but not share or play it
var use_strophe = true;

var server = "localhost"; //change this to your server

//This is the hardcoded ruby 'brain' XMP identifier, which passes messages to the TV (e.g. to XBMC)
var far = "telly@"+server; 

//local search triggers some processing on search and random
//if it's false it assumes you are using an api which returns results that need no processing
var local_search = false;

//location of data or services
//these could be things like "api/search?q=..." etc 
var start_url= "starting_points/start_bbc.js";

//could be something simpler like a local file
function get_search_url(query){
 return search_url = "api/search?q="+query+"&fmt=js";
}

//could be something simpler like a local file
var random_url= "api/random?fmt=js";

//for related content - could be something simpler like a local file
function get_related_url(id){
  return related_url = "api/suggest?pid="+id+"&fmt=js"
}

//if you want xbmc to play files locally to it you can specify full local path to directory here 
//or by doing #video_files= ...
var video_files;


