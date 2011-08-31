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
      if(group_name && my_name){
        join_group(group_name);
      }else{
        //console.log("no group name sorry!");
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

  var room = group_name+"@"+group_server+"/"+my_name;

  var pres = $pres({to: room}).c('x', {xmlns: 'http://jabber.org/protocol/muc'}).tree();
  connection.sendIQ(pres);

}


function send_group_message(text){

      var room = group_name+"@"+group_server;
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

    console.log("type is "+ty);
    //catch nick conflict

    if(ty=="error"){
       var code = $(presence).find('error').attr('code')
       console.log("code is "+code);
       if(code && code=="409"){
          my_name=my_name+"_";
          $("#title").html(my_name);
          join_group(group_name);
       }
    }

    //here check for msg about the programme from a type tv

    var roster = $('#roster');

    if(roster && x){

      var name = tidy_from(fr);

      if(name==my_name){
      //ignore it if from me
      }else{

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
            html.push("<div class='snaptarget person' id='"+name+"'>");
            html.push("<img class='img_person' src='images/person.png'  />");
            html.push("<div class='friend_name'>"+name+"</div>");
            html.push("</div>");

            $('#roster').prepend(html.join(''));
            $(document).trigger('refresh');

          }
        }


      } 
    }

    return true;
}



$(document).bind('send_name', function () {

  //put name in html page too
  $("#title").html(my_name);

  var room = group_name+"@"+group_server+"/"+my_name;

  var pres = $pres({to: room}).c('x', {xmlns: 'http://jabber.org/protocol/muc'}).tree();
  connection.sendIQ(pres);
});


//respond to message

function on_message(msg) {
    var elems = msg.getElementsByTagName('body'); 
    var type = msg.getAttribute('type');
    var fr = $(msg).attr('from')
    n = tidy_from(fr);

    if (type == "chat" || type == "groupchat"  && elems.length > 0) {  
        var body = elems[0];  
        var text = Strophe.getText(body); 
        //console.log("text "+text)

        var j = eval("z="+text);

        //fugly
      
        if(j['type'] && j['type']=='tv'){
            //remove the old one
            var name = tidy_from(fr);
            my_tv = name;
            $("#"+name).css("display","none"); //@@delete it?
            $("#"+name).remove(); //@@delete it?

            var html_tv = [];
            //console.log("got a tv from a private chat "+j['type']+" from "+name);
            html_tv.push("<h3 class='contrast'>NOW WATCHING</h3>");
            html_tv.push("<div class='snaptarget_tv telly' id='"+name+"'>");

            html_tv.push("<div style='float:right;font-size:16px;padding-top:10px;padding-right:10px;'>"+my_tv_name+"</div>");

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

          if(j && j["pid"]){
            var id = generate_new_id(j,n);
            var html = generate_html_for_programme(j,n,id);
            $('#results').prepend(html.join(''));

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

    if (type == "groupchat"  && elems.length > 0) {
           var body = elems[0];

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
                   var html = generate_html_for_programme(j,n,id);
                    $('#results').prepend(html.join(''));
                 }

                 var video = j["video"];
                 var title = j["title"];
      		 //the TV
                 if(video!=prev_current_programme || (!prev_current_programme)){
                   current_programme=video;
                   current_programme_title = title;
                   current_programme_source_id = j["id"];
                   //console.log("current_programme_source_id "+current_programme_source_id);

                   if(my_tv){  
                     $(document).trigger('tv_changed',my_tv);
                   }else{
                     //console.log("no TV available");
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
                   var tmp = j['title'];
                   tmp = tmp.replace(" failed to play","");
                   msg_text = my_tv_name+" started playing "+tmp;
                   if(msg_text!=last_message){
                      build_notification(msg_text);
                      last_message=msg_text;
                   }
                 }else{ // never happens
//                   var tmp = j['title'];
  //                 tmp = tmp.replace(" failed to play","");
    //               msg_text = n+" suggested "+tmp+" to you";
      //             build_notification(msg_text);
                 }

                $(document).trigger('refresh_buttons');
                $(document).trigger('refresh');

               }
            
             }catch(e){
               //console.log(e);
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
             if(current_programme_title && current_programme_title!=""){
               $("#"+id).find(".dotted_spacer").html(current_programme_title)
               $("#"+id).attr("source_id",current_programme_source_id);

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
                        zIndex: 2700
                }).addTouch();

                $( ".snaptarget" ).droppable({
      
                        hoverClass: "dd_highlight",
                        drop: function(event, ui) {
        
                                var el = $(this);

                                var jid = el.attr('id');

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
         
                $( ".snaptarget_tv" ).droppable({  //for tvs
      
                        hoverClass: "dd_highlight",
                        drop: function(event, ui) {
        
                                var el = $(this);
                                var jid = el.attr('id');
    
                                var el3 = ui.helper;
                                var el2 = el3.parent();

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

//adds an overlay and inserts related stuff
      
$(document).bind('refresh_buttons', function () {  
                $(".programme").unbind('click');
                $( ".programme" ).click(function() {
                        insert_suggest2($( this ).attr("id"));//??
                        return false;
    
                });
//.addTouch();
//    $(document).trigger('refresh');
});
     

///to and from html

function generate_new_id(j,n){
  var i = j["pid"]+"_"+n; //not really unique enough
  return i;                     
}


function generate_html_for_programme(j,n,id){
      var pid=j["pid"];
      var video = j["video"];
      var title=j["title"];
      var img=j["image"];
      var desc=j["description"];
      
      var html = [];

      html.push("<div id=\"shared_"+id+"\" pid=\""+pid+"\" href=\""+video+"\"  class=\"ui-widget-content button programme\">");

      html.push("<div><img class=\"img\" src=\""+img+"\" />");
      html.push("</div>");
      if(n){
        html.push("<span class=\"shared_by\">Shared by "+n+"</span>");
///        html.push("<div clear=\"both\"></div>");
      }
      html.push("<div clear=\"both\"></div>");
      html.push("<span class=\"p_title p_title_small\">"+title+"</span>");
      html.push("<span class=\"description large\">"+desc+"</span>");
      html.push("</div>");
      return html
}


function get_data_from_programme_html(el){
     var id = el.attr('id');
     var pid = el.attr('pid');
     var video = el.attr('href');
     var img = el.find("img").attr('src');
     var title=el.find(".p_title").text();
     var desc=el.find(".description").text();
     var explain=el.find(".explain").text();

     var res = {};
     res["id"]=id;
     res["pid"]=pid;
     res["video"]=video;
     res["img"]=img;
     res["title"]=title;
     res["description"]=desc;
     res["explanation"]=explain;

     return res;

}



if(use_strophe){
  connection.connect( server,"",linked);
}


