//this file is mosty about handling strophe
//set use_strophe=false in conf.js to just ignore strophe - you can still browse the data
//but not share it or play it
//to have it work you need to have a bosh jabber server to talk to
//this code is some of the worst in this codebase!

//We keep data on what's showing on the TV, including human-displayable title
//and what we last showed so that it doesn't restart something that's playing already

var current_programme;
var prev_current_programme;
var current_programme_title;

//my XMPP identity
var me = ""; //we need to know the anonymous id I'm given by the server
var st = 6;//strophe connection status

//bosh connecton url - see conf.js
URL = 'http://'+server+'/http-bind/';
var connection = new Strophe.Connection(URL);

var fake_roster=[]; //should be integrated with real roster really

//strophe status codes
var statusCodes=["ERROR","CONNECTING","CONNFAIL","AUTHENTICATING","AUTHFAIL","CONNECTED","DISCONNECTED","DISCONNECTING"]; 


//called when the xmpp link is made
function linked(status) {
    st = status;
    out("connection status: "+statusCodes[status] );
    if (status == Strophe.Status.CONNECTED) {
      //logging
      out("connected");

      //announcing ourselves
      var pres = $pres({type:'available',priority: 10});
      connection.send(pres);  

      //the issue here is that we may be linked before we get their name
      //if that happens we wait
      if(my_name){
        ask_for_friendship();
      }else{
        var t = setTimeout("ask_for_friendship()",5000);
      }

    }
    if (status == Strophe.Status.DISCONNECTED || status == Strophe.Status.DISCONNECTING) {
      //overlay to warn users that they are not connected
      show_disconnect();
    }
  
}


//send a chat command
function sendCommand(text,to) {
    out("sent command: "+text+" to "+to);
    if (st == Strophe.Status.CONNECTED) { 
      var stanza = new Strophe.Builder( "message", {"to": to,
         "type": "chat"} ).c("body").t(text);
      connection.send(stanza);
    } 
}

//to send a goodbye message to the network
//to help with notifying everyone that we are gone

window.onbeforeunload= function (evt) {
    if (st == Strophe.Status.CONNECTED) { 
       //first send a status msg
       var pres = $pres({type:'unavailable',priority: 10});
       connection.send(pres);
       connection.flush(); 
       connection.disconnect(); 
    }
}


//called to tell the brain that we want to play something
//or to give the programme to another user
function sendProgramme(prog,prog_url,title,jid,img){
    var snd = document.getElementById("a2");
    snd.play();
    str = "{\"id\":\""+prog+"\",\"video\":\""+prog_url+"\",\"title\":\""+title+"\",\"image\":\""+img+"\"}"
    sendCommand(str,jid+"@"+server+"/dd")
    return false;
}

//logging
function out(msg) {
  var out = document.getElementById('out');
  out.innerHTML = msg;
}


//if we see this sort of thing:
//<iq xmlns='jabber:client' from='24719936041299516758375682@jabber.notu.be'
//to='24719936041299516758375682@jabber.notu.be/38616272751299516758867976' id='push1224773019' type='set'><query
//xmlns='jabber:iq:roster'><item subscription='both' jid='test_brain@jabber.notu.be'/></query></iq>
//we add it automatically, i.e. we always accept friend requests

function on_roster_add(msg){

  var ty = $(msg).find('item').attr('subscription');
  if(ty && ty=="both"){
      //we trigger a roster upadte                      
      var fr = $(msg).find('item').attr('jid');
      buildRoster(st);
  }

  return true;
}



//various kinds of things are sent as presence messages
//we use it as a way for the brain to distribute the names and ids of the participants 
//so that we can subscribe to them
//plus what's playing on the TV

function on_presence(presence) {

  var ty = $(presence).attr('type');

  if(ty && ty=="subscribe"){
     //subscribe request - we always accept
     var fr = $(presence).attr('from');
     me = $(presence).attr('to');
     var pres = $pres({type:'subscribed',to: fr,from: me});
     connection.send(pres);
  }else{
     ///not sure if this is doing anything
     //idea is to make sure everything in roster is showing availability correctly
     //data here is coming from the brain

     if(!ty){
       var fro = $(presence).attr('from');
       for(var c in contacts){
         if(fro.match(c)){
           var con = contacts[c];
           con.status="available";
         }
       }
     }

//if it's in contacts but *not* in fr, then it needs to be marked unavailable        

     var r_changed=false;

     if(ty && ty=="unavailable"){
       var fro = $(presence).attr('from');

       for(var c in contacts){
         if(fro.match(c)){
           var con = contacts[c];
           con.status="unavailable";
           r_changed=true;
         }
       }
     }


//go through the presence message, sorting out the tv from the friends

     var status = $(presence).find("status").text();
     if(status){
       var j = eval("z="+status);

       var friends = j["friends"];

       var video = j["video"];
       var title = j["title"];

//the TV

       if(video!=prev_current_programme){
           r_changed=true;
           current_programme=video;
           current_programme_title = title;
           $(document).trigger('tv_changed',contacts);
       }
     
//the people
       for(var id in friends){

            var fr = id
            var fr_name= friends[id];

            if(me.match(fr)){
              my_name=fr_name;
              if(fr_name && fr_name!=""){
                var d = document.getElementById("title");
                d.innerHTML="Hello "+fr_name+"!";
              }
            }else{
//hm, not sure how this works! but it does
             if( $.inArray(fr, fake_roster)){//@@fixme - should be in contacts

              fake_roster.push(fr);
              roster_names[fr]=fr_name;
              ask_for_friendship(fr);
            }else{

            }
           }
     
       }
     }
  

    
  }

  return true;
     
}

//send subscribe message     
//the issue here is that we want to decide our own name ourselves
//as far as I can see, these subscription presence messages don't allow 
//you to do that in the official spec

function ask_for_friendship(jid){
/*
//from the spec:
<iq type='set' id='set1'>
  <query xmlns='jabber:iq:roster'>
    <item
        jid='contact@example.org'
        name='MyContact'>
      <group>MyBuddies</group>
    </item>
  </query>
</iq>
*/

  if(!jid){
    jid = far;
  }

//can't send name using this method, so we add a bit on the end that we understand

   var pres2 = $pres({type:'subscribe',to: jid}).c('name').t(my_name);
   connection.send(pres2);
}


//respond to message
//the only type of message we get is a programme from a friend

function on_message(msg) {
    event = Strophe.getText(msg.firstChild);
    //who is the message from? we want to show this in the UI
    //get rid of the junk after the final / to match it up
    var fr = $(msg).attr('from');
    fr_long = fr;
    fr = fr.replace(/\/.*$/,"");

    //get the name form our list of friends provided by the brain
    var n = roster_names[fr];

    //play the sound!
    var snd = document.getElementById("a1");
    snd.play();

    //fix the protocol
    var j = eval("z="+event);
    console.log("msg "+event);
    if(j && j["id"]){
      var pid=j["id"];
      var video = j["video"];
      var title=j["title"];
      var img=j["image"];
      var html = [];
      html.push("<div id=\""+pid+"\" href=\""+video+"\"  class=\"ui-widget-content button draggable2 newClass\">");
      html.push("<img class=\"img\" src=\""+img+"\" height=\"100\"/>");
      html.push("<p class=\"p_title\">"+title+"</p>");
      html.push("<p><b>Shared by "+n+"</b></p>");
      html.push("</div>");
      $('#history').prepend(html.join(''));

      //make the person box and the new shared item glow yellow
      $( '#'+pid ).addClass( "ui-state-highlight",10,function() {
           setTimeout(function() {
             $( '#'+pid ).removeClass( "ui-state-highlight" ,100);
           }, 1500 );

      });

      var z = fr.replace(/@.*$/,"");

      $( '#'+z ).addClass( "ui-state-highlight",10,function() {
           setTimeout(function() {
             $( '#'+z ).removeClass( "ui-state-highlight" ,100);
           }, 1500 );

      });

      out("got event id "+pid);
    }

    refresh();
    refresh_buttons();
    return true;

}
    
///end of strophe-only stuff
//the remainder in this file is a combination of strophe-related and drag and drop 


//touch stuff
//this extends drag and drop to work on touchscreens

$.extend($.support, {
        touch: "ontouchend" in document
});


// Hook up touch events
$.fn.addTouch = function() {
        if ($.support.touch) {
                this.each(function(i,el){
                        el.addEventListener("touchstart", iPadTouchHandler, false);
                        el.addEventListener("touchmove", iPadTouchHandler, false);
                        el.addEventListener("touchend", iPadTouchHandler, false);
                        el.addEventListener("touchcancel", iPadTouchHandler, false);
                });
        }
};


//if tv has changed, change the icon

$(document).bind('tv_changed', function (ev,contacts) {

    $.each(contacts, function (jid) {
        var con = contacts[jid];
        var status = con.status;
        var id = jid.replace("@"+server,"");
        var name = con.name || id;

        if(status=="available"){

//if it's a TV, we display it in a certain way
//this is a horrible way of doing it - could we use groups?

          if(name.match("telly") || name.match("tv")){ 
            $("#"+id).find("p").html("<p>"+current_programme_title+"</p>")

          }
        }  
    });
        
});



//strophe add-on
//when roster changes, does stuff
//@@ I don't know why we need this code duplicated so many times :-/

$(document).bind('roster_changed', function (ev, roster) {

    $('#roster').empty();
    var empty = true;  
    var html = [];
    $.each(roster.contacts, function (jid) {
        empty = false;
        var status = 'offline';

        var x = this.online();
        if (this.online()) {
            var away = true;
            for (var k in this.resources) {
                if (this.resources[k].show === 'online') {
                    away = false;
                }
            }
            status = away ? 'away': 'online';
        }
   

        var con = contacts[jid];
        var status = con.status;
        var id = jid.replace("@"+server,"");
        var name = con.name || id;
        if(status=="available"){
          html.push("<div class='snaptarget ui-widget-content' id='"+id+"'>");

          if(name.match("telly") || name.match("tv")){ // shoudl be groups!! although there's only 1 tv ever atm (the brain)
            html.push("<div class='center'><img src='images/tv.png' width='120' /></div>");  
            if(current_programme_title && current_programme_title!=""){
              html.push("<p>"+current_programme_title+"</p>");  
//              html.push("<p>Waiting...</p>");
            }else{
              html.push("<p>Nothing currently playing</p>");
            }
          }else{
            html.push("<div class='center'><img src='images/person.png' height='100' /></div>");  
            html.push("<p>"+name+" - "+status+"</p>");  
          }
          html.push("</div>");
        }  
    });
        
    $('#roster').append(html.join(''));

    refresh();
   

});



//ensure that everything that should be draggable and droppable is

function refresh(){
        
        $(function() {
                $( "#draggable" ).draggable();
                $( ".draggable2" ).draggable({ opacity: 0.7, helper: "clone"}).addTouch();
                $( ".draggable3" ).draggable({ opacity: 0.7, helper: "clone"}).addTouch();
       
                $( ".snaptarget" ).droppable({
                        drop: function(event, ui) {
                                var el = $(this);
                                var el2 = ui.helper;
                                var prog = el2.attr('id');
                                var jid = el.attr('id');
                                var url = el2.attr('href');
                                var img = el2.find("img").attr('src');
                                var c = contacts[jid+"@"+server];
                                var name = c.name || jid; 

                                var title=el2.find( "p" ).html();
                                sendProgramme(prog,url,title,jid,img);

                                if(jid.match("tv") || jid.match("telly")){ //ugh@@ 
                                  el.find( "p" ).html("Waiting...");
                                }
                                  
//                              $( this ).find( "p" ).html( "Dropped! "+el2.attr('id')+" to "+name);
                                $( this ).addClass( "ui-state-highlight",10,function() {
                                        setTimeout(function() {
                                                el.removeClass( "ui-state-highlight" ,100);
                                        }, 1500 );
        
                                });
                        }
       
                }).addTouch();

	});

}


//makes the boxes expand
//@@ somewhat broken
function refresh_buttons(){

		$( ".button" ).click(function() {
			insert_suggest2($( this ).attr("id"));
			return true;
			
                }).addTouch();

/*
        $(function() {

		$( ".button" ).click(function() {
			insert_suggest2($( this ).attr("id"));
                        var speed = 200;
                        if($( this ).hasClass("newClass")){
		  	  $( this ).removeClass( "newClass",speed).find(".large").css("display","none");
                        }else{
  			  $( this ).addClass( "newClass",speed).find(".large").css("display","block").find(".explain").css("display","none");
                        }
			return true;
			
                }).addTouch();

        });
*/
}


connection.addHandler( on_message,     null,     "message",    "chat");
connection.addHandler(on_roster_add, "jabber:iq:roster", "iq", "set");
connection.addHandler(on_presence, null, "presence");

if(use_strophe){
  connection.connect( server,"",linked);
}


//strophe logging
//doesn't work on mozilla
//connection.rawInput = function (data) { console.log(data)};
//connection.rawOutput = function (data) { console.log(data) };
