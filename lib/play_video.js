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

var events_list = [];
var events_list_sent = [];

function process_events(data){
  events_list = [];
  events_list_sent = [];
  console.log("got events data");
//console.log(data);
  for (var e in data["events"]){
    var st_t = data["events"][e]["start"];
    var e_data = data["events"][e]["data"];
     if(st_t){
      events_list[st_t]=e_data;
     }
  }
}


function process_video(programme,formats,provider,width,height){
  if(!width){
     width="760";
  }
  if(!height){
     height = "400";
  }

  var swf = formats["swf"];
  var mp4 = formats["mp4"];


     if(mp4){
       var uri = mp4["uri"];
       $("#player").html("<video id='myvid' width=\"100%\" controls autoplay><source src=\""+uri+"\"></video>");

       //events
       var myvid = document.getElementById("myvid");
       if(myvid){
           myvid.addEventListener('timeupdate',function(){

           if(events_list.length>0){
              var z = parseInt(myvid.currentTime)+'';//int isn;t really precise enough
              if(events_list[z] && (!events_list_sent[z])){
                events_list_sent[z]=true;
                console.log(events_list_sent);
                console.log("found event and triggering");
                console.log(events_list[z]);

                var item = events_list[z];
                if(item["format"].match("video")){
////                   item["item_type"]="video";
                }else{
                   item["item_type"]="webpage";
                }
                if(buttons){
                  buttons.share(item);
                }
              }
           }else{
              console.log( "no events");
           }
         });
       }

     }else{
      if(swf){
        var uri = swf["uri"];
        console.log("playing swf "+uri);
        //pick your swf player here
        alert("no swf player specififed");
      }

   }//end else

}//end method


