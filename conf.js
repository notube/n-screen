//my human readable name
//can also be specified using #user_name=
var my_name;

//if this is false it just ignores strophe
//you can still browse and search the data but not share or play it
var use_strophe = false;

var server = "localhost"; //change this to your server

//This is the hardcoded ruby 'brain' XMP identifier, which passes messages to the TV (e.g. to XBMC)
var far = "telly@"+server; 

var local_search = true;

//location of data or services
//these could be things like "api/search?q=..." etc 
var start_url="data/all_data.js";

//this is the simple statuc version
//could be something like 
//api/search?q="+escape(txt)+"&fmt=json",
function get_search_url(query){
 return search_url = "data/all_data.js";
}

//simplest - could be an api
var random_url= "data/all_data.js";

//for related content
//this is the static version. Could be something like
// api/related?id=...
function get_related_url(id){
  return related_url = "data/"+id+".js";
}

//if you want xbmc to play files locally to it you can specify full local path to directory here 
//or by doing #video_files= ...
var video_files;


