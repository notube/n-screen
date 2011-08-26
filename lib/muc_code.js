//We keep data on what's showing on the TV, including human-displayable title
//and what we last showed so that it doesn't restart something that's playing already


var current_programme;
var current_programme_source_id;
var prev_current_programme;
var current_programme_title;

var last_message;//bleah - notifications issue - duplicates get sent

//my XMPP identity
var me = ""; //we need to know the anonymous id I'm given by the server
var st = 6;//strophe connection status

var synced = false;


var group_name="default_muc";
//var my_name;
var group_server="conference."+server;
URL = 'http://'+server+'/http-bind/';
var connection = new Strophe.Connection(URL);

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

      //join group. tmp for now 
console.log("JOINING GROUP "+group_name);
      if(group_name && my_name){
        join_group(group_name);
      }else{
        console.log("no group name sorry!");
      }

    }
    if (status == Strophe.Status.DISCONNECTED || status == Strophe.Status.DISCONNECTING) {
      //overlay to warn users that they are not connected
      show_disconnect();
    }
  
}


function set_group_name(gn){
  if(gn && gn!=""){
    group_name = gn;
  }
}


//create or join group
function join_group(group_name){

  console.log("XXXXXX joining group!!!! "+group_name+" name "+my_name);

  var room = group_name+"@"+group_server+"/"+my_name;

  var pres = $pres({to: room}).c('x', {xmlns: 'http://jabber.org/protocol/muc'}).tree();
  connection.sendIQ(pres);

}


function send_group_message(text){

      var room = group_name+"@"+group_server;
//console.log("sending msg "+text+" to group "+room);
      var stanza = new Strophe.Builder( "message", {"to": room,
         "type": "groupchat"} ).c("body").t(text);
      connection.send(stanza);

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

//logging
function out(msg) {
  var out = document.getElementById('out');
  out.innerHTML = msg;
}


//called to tell the brain that we want to play something
//or to give the programme to another user
function sendProgramme(res,jid){
    var snd = document.getElementById("a2");
    snd.play();

    jid = jid.replace(/\@.*/,"");

    str = "{\"id\":\""+res["id"]+"\",\"pid\":\""+res["pid"]+"\", \"video\":\""+res["video"]+"\",\"title\":\""+res["title"]+"\", \"image\":\""+res["img"]+"\",\"description\":\""+res["description"]+"\", \"nick\":\""+my_name+"\"}"

    var room_person = group_name+"@"+group_server+"/"+jid;

    sendCommand(str,room_person);
    //console.log("sending "+str+" to "+room_person);
    return false;
}



function on_presence(presence) {
    event = Strophe.getText(presence.firstChild);
    var fr = $(presence).attr('from');
    var ty = $(presence).attr('type');
    var x = $(presence).find('item').attr('role');//make sure it's the particpant or owner, not the thing itself
//here check for msg about the programme from a type tv
    //console.log("presence");
    //console.log(presence);
    //console.log("type "+ty);

    var roster = $('#roster');

    if(roster && x){

      var name = tidy_from(fr);

      if(name==my_name){
      }else{

        //console.log("ok name "+name+" ty "+ty);

        var html=[];

        if($("#"+name).length > 0){
          if(ty && ty=="unavailable"){
            $("#"+name).css("display","none"); //@@delete it?
            $("#"+name).remove(); //@@delete it?
          }
        }else{
          if(ty && ty=="unavailable"){
            $("#"+name).css("display","none");            
          }else{

            html.push("<div class='snaptarget' id='"+name+"'>");
            html.push("<img class='img_person' src='images/person.png'  />");
            html.push("<div class='friend_name'>"+name+"</div>");
            html.push("</div>");
//            html.push("<br clear=\"both\" />");

            //roster.prepend("<div id='"+name+"'>"+name+"</div>")           
            //console.log("found html");
            //console.log(html.join(''));
            $('#roster').prepend(html.join(''));
            $(document).trigger('refresh');

          }
        }


      } 
    }

    return true;
}


$(document).bind('roster_changed', function (ev, ty,name) {


});


$(document).bind('send_name', function () {

  //put name in html page too
  $("#title").html(my_name);

  var room = group_name+"@"+group_server+"/"+my_name;

  var pres = $pres({to: room}).c('x', {xmlns: 'http://jabber.org/protocol/muc'}).tree();
  connection.sendIQ(pres);
});

//respond to message

function on_message(msg) {
    console.log("%%%%%%%%% msg");
    console.log(msg);
    var elems = msg.getElementsByTagName('body'); 
    var type = msg.getAttribute('type');
    var fr = $(msg).attr('from')
    n = tidy_from(fr);

    if (type == "chat" || type == "groupchat"  && elems.length > 0) {  
        var body = elems[0];  
        var text = Strophe.getText(body); 
        console.log("text "+text)

        var j = eval("z="+text);

        //fugly
      
        if(j['type'] && j['type']=='tv'){
            //remove the old one
            var name = tidy_from(fr);
            my_tv = name;
            $("#"+name).css("display","none"); //@@delete it?
            $("#"+name).remove(); //@@delete it?

            var html_tv = [];
            console.log("got a tv from a private chat "+j['type']+" from "+name);
            html_tv.push("<h3 class='contrast'>NOW WATCHING</h3>");
            html_tv.push("<div class='snaptarget2 telly' id='"+name+"'>");

            html_tv.push("<div style='float:right;font-size:14px;padding-top:10px;'>"+my_tv_name+"</div>");

            html_tv.push("<div style='float:left'><img class='img_tv' src='images/tiny_tv.png' /></div>");

            html_tv.push("<br clear=\"both\" />");
            
            html_tv.push("<div class='dotted_spacer'>");  
            if(current_programme_title && current_programme_title!=""){
              html_tv.push(current_programme_title);
            }else{
              html_tv.push("Nothing currently playing");
            }
            html_tv.push("</div>");
            html_tv.push("</div>");
            html_tv.push("<br clear=\"both\"></br>");
            $('#tv').html(html_tv.join(''));
            $(document).trigger('refresh');

        }else{

          console.log("XXXXXXXXXXXXXXX");
          console.log(msg);
          if(j && j["pid"]){
            var id = generate_new_id(j,n);
            var html = generate_html_for_programme(j,n,id,true);
            $('#results').prepend(html.join(''));
            //var id = j["id"];
            //make the person box and the new shared item glow 
            $( '#'+id ).addClass( "dd_highlight",10,function() {
               setTimeout(function() {
               $( '#'+id ).removeClass( "dd_highlight" ,100);
             }, 1500 );

            });

            $( '#'+n ).addClass( "dd_highlight",10,function() {
               setTimeout(function() {
                 $( '#'+n ).removeClass( "dd_highlight" ,100);
               }, 1500 );

            });
          }
        
    
          if(n && j['title']){
            //console.log(j); 
    
            var p = $("#notify").text();
            var num = parseInt(p);
            if(!num){
              num=1;
            }else{
              num = num+1;
            }

            $("#notify").html(num);
            $("#notify").show();

            $("#notify_large").append("<div class='dotty_bottom'>"+n+" suggested "+j['title']+" to you</div>");

          }
          $(document).trigger('refresh_buttons');
          $(document).trigger('refresh');
        }
        return true;
    }     
}

function tidy_from(fr){
  var z = fr.replace(/.*\//,"");
  return z; 
}    


      

function on_group_message(msg) {
    var elems = msg.getElementsByTagName('body');
    var type = msg.getAttribute('type');

console.log("group chat");
    if (type == "groupchat"  && elems.length > 0) {
           var body = elems[0];
console.log(body);

           var delay = msg.getElementsByTagName('delay');
           if(delay){
             delay = delay[0];
           }
           var text = Strophe.getText(body);
           var fr = $(msg).attr('from');
           var name = tidy_from(fr);

           //console.log("got message "+text+" with delay "+delay);
           if(!delay && (name!=my_name)){
             //console.log("ok");

             try{
               var j = eval("z="+text);
               //fugly
               if(j['type'] && j['type']=='tv'){
                  //console.log("got a tv... "+j['type']);
                  my_tv = name;
               }

               //console.log(msg);
               if(j && j["pid"]){

                 if(my_tv && my_tv!=name){ //don't show up on history
                   var id = generate_new_id(j,n);
                   var html = generate_html_for_programme(j,n,id,true);
                    $('#results').prepend(html.join(''));
                 }

                 var video = j["video"];
                 var title = j["title"];
      		 //the TV
                 if(video!=prev_current_programme || (!prev_current_programme)){
                   current_programme=video;
                   current_programme_title = title;
                   current_programme_source_id = j["id"];
                   console.log("current_programme_source_id "+current_programme_source_id);

                   if(my_tv){  
                     $(document).trigger('tv_changed',my_tv);
                   }else{
                     console.log("no TV available");
                   }
                 }
      
                 //make the person box and the new shared item glow 
                  $( '#'+id ).addClass( "dd_highlight",10,function() {
                    setTimeout(function() {
                    $( '#'+id ).removeClass( "dd_highlight" ,100);
                    }, 1500 );
                  });

                  $( '#'+n ).addClass( "dd_highlight",10,function() {
                    setTimeout(function() {
                    $( '#'+n ).removeClass( "dd_highlight" ,100);
                    }, 1500 );
                  });
               }
        
               if(n && j['title']){

                 var msg_text;
                 if(n==my_tv){
                   msg_text = my_tv_name+" started playing "+j['title'];
                   if(msg_text!=last_message){
                      build_notification(msg_text);
                      last_message=msg_text;
                   }
                 }else{
                   msg_text = n+" sent you "+j['title'];
                   build_notification(msg_text);
                 }

                $(document).trigger('refresh_buttons');
                $(document).trigger('refresh');

               }
            
             }catch(e){
               console.log(e);
             }


           }else{
             //console.log("delay or from me");
           }
    }


    return true;
}
    

function build_notification(msg_text){
                 var p = $("#notify").text();
                 var num = parseInt(p);

                 if(!num){
                   num=1;
                 }else{
                   num = num+1;
                 }
                 $("#notify").html(num);
                 $("#notify").show();

                 $("#notify_large").prepend("<div class='dotty_bottom'>"+msg_text+" </div>");//not sure if append / prepend makes most sense.

}


connection.addHandler( on_group_message,     null,    "message" );
connection.addHandler( on_message,     null,     "message",    "chat");
connection.addHandler(on_presence, null, "presence");


//strophe logging
//doesn't work on mozilla
//connection.rawInput = function (data) { console.log(data)};
//connection.rawOutput = function (data) { console.log(data) };

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
           
$(document).bind('tv_changed', function (ev,id) {
console.log("TV changed");
             if(current_programme_title && current_programme_title!=""){
console.log("ok2 "+id+" ...");
console.log($("#"+id).find(".dotted_spacer"));
               $("#"+id).find(".dotted_spacer").html(current_programme_title)
console.log("source id");
console.log($("#"+id).attr("source_id"));
               $("#"+id).attr("source_id",current_programme_source_id);

console.log("adding click to #"+id+" "+current_programme_source_id);

               $("#"+id).click(function() {
                        insert_suggest2(current_programme_source_id);
                        return false;
                }).addTouch();
             }
                        
});   


//ensure that everything that should be draggable and droppable is
            
$(document).bind('refresh', function () {
                $( "#draggable" ).draggable();
                $( ".programme" ).draggable(
                        {
                        opacity: 0.7,
                        helper: "clone",
                        zIndex: 2700,
                        handle: ".grabby"
                }).addTouch();

            
                $( ".draggable3" ).draggable({ opacity: 0.7, helper: 
"clone"}).addTouch();
         
                $( ".snaptarget" ).droppable({
      
                        hoverClass: "dd_highlight",
                        drop: function(event, ui) {
        
                                var el = $(this);

                                var jid = el.attr('id');
console.log("snaptarget 1 "+jid+" to ");
console.log(el);    

                                var el3 = ui.helper;
                                var el2 = el3.parent();

                                var res = get_data_from_programme_html(el3);//??
                                var url = el3.attr('href');
                                sendProgramme(res,jid);
            
                                $( this ).addClass( "dd_highlight",10,function() {
                                        setTimeout(function() {
                                                el.removeClass( "dd_highlight" ,100);
                                        }, 1500 );
                        
                                });
                        }
                        
                }).addTouch();
         
                $( ".snaptarget2" ).droppable({  //for tvs
      
                        hoverClass: "dd_highlight",
                        drop: function(event, ui) {
        
                                var el = $(this);
                                var jid = el.attr('id');
    
                                var el3 = ui.helper;
                                var el2 = el3.parent();

console.log("snaptarget 2 "+jid);
                                var res = get_data_from_programme_html(el3);//??
                                var url = el3.attr('href');
                                var name = jid;

                                sendProgramme(res,jid);

                                $( this ).addClass( "dd_highlight",10,function() {
                                        setTimeout(function() {
                                                el.removeClass( "dd_highlight" ,100);

                                        }, 1500 );
                        
                                });

                        }
                        
                }).addTouch();
         
});

//makes the boxes expand and inserts related stuff
      
$(document).bind('refresh_buttons', function () {  
                $(".p_title").unbind('click');
                $( ".p_title" ).click(function() {
console.log("id for insert refresh 2 is "+$( this ).attr("id"));
                        insert_suggest2($( this ).parent().attr("id"));//??
                        return false;
    
                }).addTouch();
//    $(document).trigger('refresh');
});
     

///to and from html

function generate_new_id(j,n){
  var i = j["pid"]+"_"+n; //not really unique enough
  return i;                     
}


function generate_html_for_programme(j,n,id,grabby){
      var pid=j["pid"];
      var video = j["video"];
      var title=j["title"];
      var img=j["image"];
      var desc=j["description"];
      
      var html = [];

      html.push("<div id=\"shared_"+id+"\" pid=\""+pid+"\" href=\""+video+"\"  class=\"ui-widget-content button programme\">");

      if(grabby){ 
        html.push("<div class='grabby'></div>");
      }
      html.push("<div><img class=\"img\" src=\""+img+"\" /></div>");
      html.push("<span class=\"p_title p_title_small\">"+title+"</span>");
      html.push("<div clear=\"both\"></div>");
      if(n){
        html.push("<span class=\"shared_by\">Shared by "+n+"</span>");
        html.push("<div clear=\"both\"></div>");
      }
console.log("ok2[3]");
      html.push("<span class=\"description large\">"+desc+"</span>");
      html.push("</div>");
console.log("ok2[4] "+html);
      return html
}


function get_data_from_programme_html(el){
console.log("ok[1]");
     var id = el.attr('id');
     var pid = el.attr('pid');
console.log("ok[1a] "+pid);
     var video = el.attr('href');
     var img = el.find("img").attr('src');
     var title=el.find(".p_title").text();
     var desc=el.find(".description").text();
     var explain=el.find(".explain").text();
console.log("ok[2] "+title);

     var res = {};
     res["id"]=id;
     res["pid"]=pid;
     res["video"]=video;
     res["img"]=img;
     res["title"]=title;
     res["description"]=desc;
     res["explanation"]=explain;
console.log("ok[3]");

     return res;

}



if(use_strophe){
  connection.connect( server,"",linked);
}


