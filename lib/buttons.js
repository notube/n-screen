/*
 --------------------------------------------------------------------------
 Copyright 2012 British Broadcasting Corporation and Vrije Universiteit 
 Amsterdam

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 --------------------------------------------------------------------------
*/

/*

This is a wrapper around strophe.js that's supposed to make it simpler to use as a way to 
share json messages about programmes. The idea is that when created using

buttons = new ButtonsLink({"server":"jabber.example.com"});

it creates a link to the server, and then 

buttons.connect("my_name","my_group",false); // third arg is debugging

you can share items

buttons.share(programme,new Person(name,name)); // without the person, just sends to group

then various triggers can be listened for (it depends on jquery):

$(document).trigger('connected',[blink]); //connected
$(document).trigger('items_changed',[blink]); //group members changed
$(document).trigger('tv_changed',[programme]); //tv changed with info
$(document).trigger('shared_changed',[programme,to_whom,msg_type]); //item was shared to person or group (msg_type)
$(document).trigger('disconnected'); //disconnected

Different types of participants can be detected:

item.obj_type //can be person, bot, tv or unknown

We are starting to add different types of shared items - currently only programme is fully supported

*/

//connection object

function ButtonsLink(config){
  this.auto_reconnect=false;
  if(config["auto_reconnect"]){
    this.auto_reconnect=config["auto_reconnect"];
  }
  this.server = config["server"];
  this.me = null;
  this.URL = 'http://'+this.server+'/http-bind/';

  if(this.server==null){
    console.error("config requires a server parameter in the hash, such as jabber.example.com");
    return null;
  }

  this.connect = do_connect;
  this.share = share;

//strophe stuff
  this.connection = null;
  this.blink = null;
  this.linked = linked;

//strophe status codes
  this.statusCodes=["ERROR","CONNECTING","CONNFAIL","AUTHENTICATING","AUTHFAIL","CONNECTED","DISCONNECTED","DISCONNECTING"]; 

}


//utility function to clean up person names

function tidy_from(fr){
  var z = fr.replace(/.*\//,"");
  return z; 
}    


function do_connect(person,group_name,debug){
  console.log("connecting...");
  this.connection = new Strophe.Connection(this.URL);

  this.me = person;
  this.connection.bl = this;
  this.connection.connect(this.server,"",this.linked);
  this.connection.join_group=join_group;
  this.connection.sendCommand = sendCommand;
  this.connection.send_group_message = send_group_message;
  this.connection.group_name = group_name;
  this.connection.group_server= "conference."+this.server;

  if(debug){
//    this.connection.rawInput = function (data) { console.log(data)};
//    this.connection.rawOutput = function (data) { console.log(data) };
  }
}


//called when the xmpp link is made
function linked(status) {
    //'this' is now a connection object
    var conn = this; 
    console.log("ok... linked");
    if (status == 5) {
      //announcing ourselves
      var pres = $pres({type:'available',priority: 10});
      conn.send(pres);  

      //join group.
      if(conn.group_name && conn.bl.me.name){
        conn.join_group();
      }else{
        console.log("no group name - use set_group_name");
      }
 
      this.bl.blink = new Blink({"status":status,"group_name":conn.group_name});

      //trigger connected
      $(document).trigger('connected',[this.bl.blink]);



      //handlers      

      //handler for presence messages
      conn.addHandler(function(presence){

        event = Strophe.getText(presence.firstChild);
        var fr = $(presence).attr('from');
        var ty = $(presence).attr('type');
        var role = $(presence).find('item').attr('role');//make sure it's the particpant or owner, not the thing itself

        //if nick is already taken in the room, choose another
        if(ty=="error"){
           var code = $(presence).find('error').attr('code')
           console.log("code is "+code);
           if(code && code=="409"){
            conn.bl.me.name=conn.bl.me.name+"_";
            conn.join_group();
           }
        } 

        if(role){
          var name = tidy_from(fr);
          if(name!=conn.bl.me.name){//i.e. not me

              //roster has changed - a person has left - so trigger
              if(ty && ty=="unavailable"){
                 delete conn.bl.blink.items[name];
                 $(document).trigger('items_changed',[conn.bl.blink]);
              }else{
      
                //we have a new joiner
                //initially we don't know the kind of thing is is, until we get a message
                var p = new Unknown(name,name);
                conn.bl.blink.items[name]=p;

                //send info to the new joiner
                conn.bl.share(conn.bl.me,p);

                //trigger items changed
                $(document).trigger('items_changed',[conn.bl.blink]);
              }
          }else{

            //me
            conn.bl.blink.items["me"]=conn.bl.me;

            //sigh - simpler if we put me in as well
            conn.bl.blink.items[name]=conn.bl.me;
            $(document).trigger('items_changed',[conn.bl.blink]);
          }
        }


        return true;
      },"", "presence");



      //handler for private messages and group messages
      conn.addHandler(function(msg){ 

        var elems = msg.getElementsByTagName('body');
        var type = msg.getAttribute('type');
        var fr = $(msg).attr('from')
        var name = tidy_from(fr);

        if (type == "chat" || type == "groupchat"  && elems.length > 0) {
          var body = elems[0];
          var text = Strophe.getText(body);

          //if the message has been delayed, we ignore it as we have already seen it
          //here we just note how large the delay is
          var delay = msg.getElementsByTagName('delay');
          if(delay){
            delay = delay[0];
          }

          try{




//case 1): a group message generated by dropping onto 'share with group'
//case 2): a chat message generated by dropping onto tv
//case 3): a chat message generated by dropping on to person
//case 4); also I might be getting a message that the TV has changed
//if *I'm* a TV then I need to do stuff
//I need to change nowp
//case 5): finally, it could just be a message saying what sort of thing I am
//the note we distinguish who shared something from the source of it
//the sharer need not be the source

//ignore delays

          if(!delay){

          var j = JSON.parse(text);
console.log("text is "+text);
            if(j["obj_type"]){

//case 5): presence doesn't allow custom elements or attributes
//so to announce the sort of thing we are, we need to send a message
//this includes an obj_type
//when we find these we update our roster to reflect the typing
//so that we can display it appropriately
//Unknown typed objects are not displayed

               var n = j["name"];

               if(n){

                 //if we know about it already
                 //update its type
                 if(conn.bl.blink.items[n]){
                   conn.bl.blink.items[n].obj_type=j["obj_type"]

                   if(j.obj_type=="tv"){
                     console.log("found a tv");
                     //update nowp if it's a tv
                     conn.bl.blink.items[n].nowp=j["nowp"];
                   }

                   //if the obj has changed type then we trigger a roster change
                   $(document).trigger('items_changed',[conn.bl.blink]);

                 }else{
                    console.log("nok: we don't know about this item already");
                 }
               }else{
                 console.log("nok no name for the item");
               }
            }else{

//case 2: I'm the Tv and I need to change
//I play it and add to history
            if(conn.bl.me.obj_type=="tv"){
              conn.bl.me.nowp = j;

//this is kind of messy and untested
              var action = j["action"];
              switch(action){

               case "play":
                var item = conn.bl.blink.items[name];
                delete j["action"];
                j["state"] = "play";
                item.nowp=j;

                $(document).trigger('tv_changed',[item]);
                console.log("TRIGGEREd play_video");
                if(name!=conn.bl.me.name){//not from me or we get a loop
                  j["shared_by"]=name; //keep track of who controlled it
                  conn.bl.share(j,null);//shares with group
                }
                break;

               case "pause":
                var item = conn.bl.blink.items[name];
                delete j["action"];
                j["state"] = "pause";
                item.nowp=j;
                $(document).trigger('tv_changed',[item]);
                console.log("TRIGGEREd pause_video");
                if(name!=conn.bl.me.name){//not from me or we get a loop
                  j["shared_by"]=name; //keep track of who controlled it
                  conn.bl.share(j,null);//shares with group
                }
                break;

               case "display":
                var item = conn.bl.blink.items[name];
                item.nowp=j;
                $(document).trigger('tv_changed',[item]);
                console.log("TRIGGEREd show text");
                break;
               default:
                console.log("unknown or no action "+action);
                break;
              }  

             }else{ 

              var sender_type = null;
              var item = conn.bl.blink.items[name];
              if(item){
                sender_type = item.obj_type;


                if(sender_type =="tv"){
                  console.log(item);
//case 4: TV has changed
//or if it came from a tv, I just update my tv
                  if(j.item_type=="programme"){
                    item.nowp=j;
                    $(document).trigger('tv_changed',[item]);
                    console.log("TRIGGEREd update tv");
                  }else{
                    $(document).trigger('shared_changed',[j,name,type]);
                  }
                }else{
//case 1 / 3:
//I add it to my history if it came from a non-tv
                  var p = conn.bl.me;
                  p.shared.unshift(j);

                  $(document).trigger('shared_changed',[j,name,type]);
                }
              }else{
                console.error("Unknown object");
              }

             }

            }
            
          }
          }catch(e){
            console.log("unable to parse json "+e);
          }


        }

        return true;
      },"", "message");


      //////end handlers
    }

    if (status == 6 || status ==7){
      console.log("disconnecting or disconnected");
      if(conn.bl.auto_reconnect){
        console.log("trying to reconnect with a 3 second delay");
        try{
          setTimeout(function() { 
             conn.bl.connect(conn.person,conn.group_name);
          }, 3000 );
        }catch(e){
           console.log("reconnection failed "+e);
           $(document).trigger('disconnected');
        }
      }else{
        $(document).trigger('disconnected');
      }
    }
}


//create or join group
function join_group(){
  var room = this.group_name+"@"+this.group_server+"/"+this.bl.me.name;
  console.log("joining "+room);
  var pres = $pres({to: room}).c('x', {xmlns: 'http://jabber.org/protocol/muc'}).tree();
  this.sendIQ(pres);
  this.bl.share(this.bl.me,null);
}



//blink (buttons link) object
function Blink(config){
  this.items = {};

  this.config = config;
  this.look = look;
  this.library = library;
}


var libraries = {};

function set_library(libr){
  libraries = libr;
}


//this stuff currently not used - I think it's too confusing

function library(){

  var random = new Service("random",libraries["random"]);
  var search = new Service("search",libraries["search"]);
  var related = new Service("related",libraries["related"]);
  var about = new Service("about",libraries["about"]);

  new_libraries =  {"random":random,"search":search,"related":related,"about":about};

  return new_libraries;
}

function look(){
  return this.items;
}

//people and TVs
function Person(name,id){
  this.name = name;
  this.obj_type="person";
  this.id = id;
  this.suggestions = [];
  this.shared = [];
  this.history = [];
}

function TV(name,id){
  this.name = name;
  this.obj_type="tv";
  this.id = id;
  this.nowp = null;
  this.suggestions = [];
  this.shared = [];
  this.history = [];
}

function Unknown(name,id){
  this.name = name;
  this.obj_type="unknown";
  this.id = id;
  this.nowp = null;
  this.suggestions = [];
  this.shared = [];
  this.history = [];
}

function Service(name,url,params){
  this.name = name;
  this.url = url;
  this.params = params;
}



//called to tell the tv that we want to play something
//or to give the programme to another user
function share(prog,person){
    var str = JSON.stringify(prog);
    //console.log("sharing "+str);
    if(person){

      var jid = person.name;
      var room_person = this.connection.group_name+"@"+this.connection.group_server+"/"+jid;
      this.connection.sendCommand(str,room_person);
    }else{
      var room = this.connection.group_name+"@"+this.connection.group_server;
      this.connection.send_group_message(str);     
    }
    return false;
}

//send a chat command
function sendCommand(text,to) {
      var stanza = new Strophe.Builder( "message", {"to": to,
         "type": "chat"} ).c("body").t(text);
       this.send(stanza);
}

function send_group_message(text){
      var room = this.group_name+"@"+this.group_server;
      var stanza = new Strophe.Builder( "message", {"to": room,
         "type": "groupchat"} ).c("body").t(text);
      this.send(stanza);
}

//to send a goodbye message to the network
//to help with notifying everyone that we are gone

window.onbeforeunload= function (evt) {
  if(this.buttons){
   var connection = this.buttons.connection;

   if(connection){
       //first send a status msg
       var pres = $pres({type:'unavailable',priority: 10});
       connection.send(pres);
       $(document).trigger('items_changed',[connection.bl.blink]);

       connection.flush();
       connection.disconnect();
   }
  }
}
 
