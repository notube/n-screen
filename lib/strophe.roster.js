//hmm        
contacts = {}; 
roster_names={};

// Contact object
function Contact() {
    this.name = "";
    this.resources = {};
    this.subscription = "none";
    this.ask = "";
    this.groups = [];
    this.status = "offline";
}
Contact.prototype = {
    // compute whether user is online from their
    // list of resources
    online: function () {
        var result = false;
        for (var k in this.resources) {
            result = true;
            break;
        }
        return result;
    }
};


function buildRoster(status) { 
    if (status === Strophe.Status.CONNECTED) { 
//        this.contacts = {}; 
        // build and send initial roster query 
        var roster_iq = $iq({type: "get"}) 
            .c('query', {xmlns: Strophe.NS.ROSTER}); 
        var that = this; 
        this.connection.sendIQ(roster_iq, function (iq) { 
            $(iq).find("item").each(function () { 

                // build a new contact and add it to the roster 
                var contact = new Contact(); 
                contact.subscription = $(this).attr('subscription') || 
                    "none"; 
                contact.ask = $(this).attr('ask') || ""; 
                if(contact.subscription=="both"){
                  contact.status="available";//we assume it is as per the RFC (sort of)
                }
//                $(this).find("group").each(function () { 
  //                  contact.groups.push(this.text()); 
    //            }); 
//                that.contacts[$(this).attr('jid')] = contact; 
                var j = $(this).attr('jid');
                contacts[j] = contact; 
                var n = roster_names[j];
                contact.name = n || $(this).attr('name'); 
            }); 
            // let user code know something happened 
            $(document).trigger('roster_changed', that); 
        }); 
    } else if (status === Strophe.Status.DISCONNECTED) { 
        // set all users offline 
//        for (var contact in this.contacts) { 
  //          this.contacts[contact].resources = {}; 
    //    } 
        // notify user code 
        $(document).trigger('roster_changed', this); 
    } 

}

