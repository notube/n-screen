#!/usr/bin/env node

// Basic XMPP bot using node.js for NoTube NScreen / Buttons sharing
//
// by Dan Brickley <danbri@danbri.org> and Libby Miller, NoTube project. 
//
//  To use, check config is OK and password is accessible, then `node notube_bot.js`
//  See NScreen Web UI at http://nscreen.notu.be/testing/ or connect via PSI desktop app for debugging.
//
// This is a Javascript utility written for Node.js, that connects to NoTube's NScreen MUC (multi-user chat)
// service. It shows up there alongside human participants, and can listen to group and individual messages.
// If you drag an item to it, it can study that item and send back a response, individually or to group.
//
// This demo will assume the item sent to use has a BBC identifier ("pid"), it then consults an HTTP JSON 
// service to find similar items, and then sends a few of those back to the original sender.
//
// Bot ideas: 
//  * more-like-this (using Mahout's similarity measures). [this one]
//  * echo bot (our first demo)
//  * a bookwork persona; send back links to books 
//  * DVD Extras: send back other info, eg. youtube video interview with cast or director or writer
//  * Invent your own, customise and run your own bot.
// 
// Notes and questions: can we have custom icons? what variety of item types are understood in NScreen UI? Channels vs shows?
// also for exec'ing, npm install node-ffi might be useful (to query SQL etc on commandline?)
// http://stackoverflow.com/questions/4443597/node-js-execute-system-command-synchronously
// Optional but recommended: https://github.com/astro/node-stringprep

// INSTALL SOME MODULES: 
// e.g. npm install util node-xmpp request jsdom http url path events node-stringprep

var sys = require('sys');
var util = require('util');
var xmpp = require('node-xmpp');
var request = require('request');
var jsdom = require('jsdom');
var http = require("http"),  
    url = require("url"),  
    path = require("path"),  
    fs = require("fs"),  
    events = require("events"); 


var nodeState="Blank.";

// ARDUINO STUFF
// https://github.com/voodootikigod/node-serialport

var serialport = require("serialport");
var SerialPort = serialport.SerialPort;
var sp = new SerialPort("/dev/cu.SLAB_USBtoUART", {baudrate: 57600,  parser: serialport.parsers.readline("\n") } ); 
// todo: make configurable or autodetect xxxx nanode


// Debugging, strongly recommended! sudo npm install -g node-inspector v8-profiler
// Then run using:  node --debug ./notube-bot.js 
// In another terminal, run 'node-inspector' and use browser-based debugger: http://0.0.0.0:8080/debug?port=5858

// shell hacks, not used yet.
/*
var FFI = require("node-ffi");
var libc = new FFI.Library(null, {
  "system": ["int32", ["string"]]
});
var run = libc.system;
*/


// Config (please customise! two installations can' be the same JID at same time...)
//
//var jid = "bob.notube@gmail.com"
var jid = "bob@jabber.notu.be"					// An XMPP JID that can talk in the MUC room
//var jid = "bob2@jabber.notu.be" // for now, the server has to have these configured (talk to Libby...)

var password = process.env.NOTUBEPASS // or however...		// Password for the XMPP account we're using
var room_jid = "3243@conference.jabber.notu.be"	// XMPP MUC room we're connecting to
var room_nick = "nanodetube"; 					// our nickname in NScreen room 

var hello = '{"name":"'+ room_nick +'","obj_type":"bot","id":"'+ room_nick +'","suggestions":[],"shared":[],"history":[]}';

var cl = new xmpp.Client({
  jid: jid + '/bot',
  password: password
});

// Log all data received over XMPP
cl.on('data', function(d) {
  util.log("[data in] " + d);
});

// Note all data received serially from Arduino/Nanode:
sp.on("data", function (data) {
    sys.puts("serial data: "+data);
    nodeState = "BlinkSetting: "+data;
});

// Once connected, set available presence and join room
cl.on('online', function() {
  util.log("We're online!");

  // set ourselves as online
  cl.send(new xmpp.Element('presence', { type: 'available' }).
    c('show').t('chat')
   );

  // join room (and request no chat history)
  cl.send(new xmpp.Element('presence', { to: room_jid+'/'+room_nick }).
    c('x', { xmlns: 'http://jabber.org/protocol/muc' })
  );

   var msg = { to: room_jid, type: 'groupchat' };
   cl.send(new xmpp.Element('message', msg ).c('body').t( hello ));
 

  // send keepalive data or server will disconnect us after 150s of inactivity
  setInterval(function() {
    cl.send(' ');
  }, 30000);
});



cl.on('stanza', function(stanza) {
  // always log error stanzas
  if (stanza.attrs.type == 'error') {
    util.log('[error] ' + stanza);
    return;
  }

  // ignore everything that isn't a room message
  if (!stanza.is('message') || !stanza.attrs.type == 'groupchat') {
    return;
  }

  // ignore messages we sent
  if (stanza.attrs.from == room_jid+'/'+room_nick) {
    return;
  }


  var body = stanza.getChild('body');
  // message without body is probably a topic change
  if (!body) {
    return;
  }
  var message = body.getText();
  //  inMsg = JSON.parse(message);
  var inMsg = null;
  try{
    inMsg = JSON.parse(message);
  }catch(e){
    console.log("json did not parse "+e);
    console.log("message was "+message);
  }

  // e.g.  {"id":"b017z1kn","pid":"b017z1kn","video":"undefined","image":"http://www.bbc.co.uk/iplayer/images/episode/b017z1kn_303_170.jpg","title":"Top Gear USA: Episode 9","description":"The guys set out to answer the question of which is America's toughest truck in Alaska.","explanation":"Recommended because you watched Top Gear USA which also has Tanner Foust in it"}
  // or {"name":"fakeLibbyMiller","obj_type":"person","id":"fakeLibbyMiller","suggestions":[],"shared":[],"history":[]}

  console.log("INFO: Got incoming msg from "+stanza.attrs.from);
  //console.log("FULL: "+message);

  if (inMsg && inMsg.obj_type == 'person') {
    console.log("msg type: "+inMsg.obj_type); // could be a person
    // We have a new buddy in the group, e.g. {"name":"danko2","obj_type":"person","id":"danko2","suggestions":[],"shared":[],"history":[]}
    var msg = { to: room_jid, type: 'groupchat' }; // could we just send presence to the new buddy instead of to the whole group?
    cl.send(new xmpp.Element('message', msg ).c('body').t( hello ));
    console.log("presence re-sent to group as "+inMsg.id+" just joined.");
  }

  if (message.indexOf('video') ) { 
    console.log("INFO: sending this directly to "+stanza.attrs.from+" instead of "+room_jid);
    //  var msg = { to: room_jid, type: 'groupchat' }; // this sends to the group
    var msg = { to: stanza.attrs.from , type: 'chat' }; // this sends back to the sender only


//<message from="3243@conference.jabber.notu.be/danbri2000" type="groupchat" to="bob@jabber.notu.be/TellyClub" >
//<body>{"id":"68","pid":"68","video":"http://video.ted.com/talks/dynamic/RobertWright_2006-high.flv","image":"http://images.ted.com/images/ted/1452_389x292.jpg","title":"How cooperation (eventually) trumps conflict","item_type":"programme","is_live":"true","description":"Author Robert Wright explains \"non-zero-sumness\" -- the network of linked fortunes and cooperation that has guided our evolution to this point -- and how we can use it to help save humanity today.","explanation":""}</body>
//</message>



    // get the url for suggestions:
    var inMsg = null;
    var newBody = null;
    try{
      inMsg = JSON.parse(message);
         var msg = { to: stanza.attrs.from , type: 'chat' }; // this sends back to the sender only
 //       suggs(cl,msg,pid); // fetch suggestions from Web and relay them to our chat buddy over XMPP MUC
	  sug = {"id": "0001", "pid": "0001", "video": "http://video.ted.com/talks/dynamic/RobertWright_2006-high.flv", "image":"http://images.ted.com/images/ted/1452_389x292.jpg",
		"title": "Nanode Device Report. " + nodeState, "explanation": "" } ;
          var qq=JSON.stringify(sug);
	  console.log("Sending as XMPP msg: "+msg+" t:"+qq);
          cl.send(new xmpp.Element('message', msg ).c('body').t(qq) );
    }catch(e){
      console.log("json did not parse "+e);
      console.log("message was "+message);
    }
  }
});

cl.on('error', function(e) {
  console.error("XMPP error received!: "+e);
  sys.puts(e);
});   



