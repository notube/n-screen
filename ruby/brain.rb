require 'rubygems'
require 'json/pure'
require 'xmpp4r'
require 'xmpp4r/roster'
require 'time'
require 'pp'
require 'net/http'

# this programme does this:
# * when something asks to play a programme, sends the message to the TV
# * when something asks to be friends with the brain
# sends a list of other friends of the brain, plus what's playing on the TV

class Brain
  include Jabber

  current_programme_id = ""
  current_programme = ""
  current_programme_title = ""
  history=nil

  attr_accessor :jid, :password, :fake_roster, :current_programme, :current_programme_title, :current_programme_id, :history
  attr_reader :client, :roster, :get_url, :valid_user

  def initialize
    self.jid = "telly@jabber.yourserver.org" #@@fixme for your server
    self.password = "password"
    @client = Client.new(self.jid)
    self.fake_roster = {}
#   Jabber::debug = true
    self.history = {}
    connect
  end


  def connect
    @client.connect
    @accept_subscriptions = true
    @client.auth(@password)
    @client.send(Presence.new.set_type(:available))

    #the "roster" is our bot contact list
    @roster = Roster::Helper.new(@client)

    start_presence_callback
    start_subscription_request_callback

    #to do something with the messages we receive
    start_message_callback

  end

  def start_message_callback
    @client.add_message_callback do |msg|
      puts "from #{msg.from}"
      jid_fr = msg.from
      data = msg.body
      programme_url = nil 
      j = JSON.parse(data)
      programme_url = j["video"]

      if programme_url
# at this point one can find or derive the playable url from other data
# hence the laboured 'history' construction
          self.current_programme_id = j["id"]     
          self.current_programme = programme_url     
          self.current_programme_title = j["title"]
          if(!self.history[programme_url])
            self.history[programme_url]=programme_url
          end

          begin
#talk to the tv

            puts "PLAYING #{programme_url}"

#look for indications of seconds for skipping in
            /\#(.*)/ =~ programme_url
            secs = nil
            if(Regexp.last_match)
              secs = Regexp.last_match[1]
              programme_url.gsub!(/\#.*/,"")
            end

# post to XBMC
            post(programme_url)

            if(secs && secs !=0)
              seek(secs)
            end
    
            new_msg = Message::new(jid_fr,"{\"result\":\"ok\"}")
            new_msg.type=:chat                    
            @client.send(new_msg)
# really there should be some error handling here @@ 
# but in reality we have to wait for it to timeout
# maybe send a provisional 'ok'?

#talk to everyone else
            status = get_status(false)
            p = Jabber::Presence.new(:chat,status)
            @client.send(p)      

          rescue Exception=>e
            puts "err #{e}"
            if(e.to_s.match("Connection refused"))
            
                puts "matched err condition [1]"

                self.current_programme_title= "#{self.current_programme_title} failed to play "

                new_msg = Message::new(jid_fr,"{\"result\":\"nok\",\"error\":\"#{e}\"}")
                new_msg.type=:chat                    
                @client.send(new_msg)

                status = get_status(false)
                p = Jabber::Presence.new(:chat,status)
                @client.send(p)      

            end
#           puts e.backtrace
            if(e.to_s.match("execution expired"))

                puts "matched err condition [2]"

                self.current_programme_title= "#{self.current_programme_title} failed to play"

                new_msg = Message::new(jid_fr,"{\"result\":\"nok\",\"error\":\"#{e}\"}")
                new_msg.type=:chat                    
                @client.send(new_msg)

                status = get_status(false)
                p = Jabber::Presence.new(:chat,status)
                @client.send(p)      
            end
          end

      end
    end
          
  end


# respond to presences

  def start_presence_callback
    @roster.add_presence_callback do |item,pres_old,pres|
      status = "hello!"
      p = Jabber::Presence.new.set_type(:available)
      @client.send(p)
    end
  end

# repond to subscription requests
# we automatically accept

  def start_subscription_request_callback
    @roster.add_subscription_request_callback do |item,presence|
      puts "accepting #{presence.from} name #{presence.name}"
      friend_name = presence.first_element_text("name")
      if(friend_name && friend_name!="")
        @roster.accept_subscription(presence.from,friend_name)
      else
        @roster.accept_subscription(presence.from)
      end
      
      # and now send sub request
      pres = Presence.new.set_type(:subscribe).set_to(presence.from)
      @client.send(pres)
      puts "sending sub req to #{presence.from}"
      sleep 2

##go through fake roster removing the cruft
# fake roster maintains the active friends, which may blip in and out of existance quickly
# really it should be real roster @@
# because otherwise you get a large build up of friends

      rost = {}#temporary
      rnames = []
      @roster.items.each do |r|
         if(r[1] && r[1].online?)
           puts r
           if(self.fake_roster[r[0].to_s])
             name=self.fake_roster[r[0].to_s]
           else
             if(friend_name && friend_name!="")
               name=friend_name
             end
           end
           rost[r[0].to_s]=name
           if(name)
             rnames.push(name)
           end
         end         
      end
      self.fake_roster={}

# if there are no names....
# a bit involved but maybe it works
# ides to get the lowest number possible
# implicit limit on number of players is 100
      rost.each do |k,v|
        name=v
        if(name==nil)
           (1..100).each do |n|
             puts n
             if(!rnames.include?("Player #{n}"))
                name="Player #{n}"
                break
             end
           end                
        end
        self.fake_roster[k]=name
      end  
      rnames=[]

# status includes information about friends

      status = get_status(false)
      p = Jabber::Presence.new(:chat,status).set_type(:available)
      @client.send(p)      

    end
  end


  def get_status(do_new)
      status = {}
      status["video"]=self.current_programme    
      status["title"]=self.current_programme_title    
      status["friends"]= fake_roster
      status_str = JSON.pretty_generate(status)

      puts "status: #{status_str}"
      return status_str
  end

#xbmc stuff

  def post(programme_url)
     host = "localhost"
     port = "8080"
     post_ws = "/jsonrpc"
     req = Net::HTTP::Post.new(post_ws, initheader = {'Content-Type' =>'application/json'})
     data = "{ \"jsonrpc\": \"2.0\", \"method\": \"XBMC.Play\", \"params\": \"#{programme_url}\", \"id\": 1 }"
     req.body = data
     response = Net::HTTP.new(host, port).start {|http| http.request(req) }
     puts "Response #{response.code} #{response.message}: #{response.body}" 
  end
            
  def seek(secs)
     host = "localhost"
     port = "8080"
     post_ws = "/jsonrpc"
     req = Net::HTTP::Post.new(post_ws, initheader = {'Content-Type' =>'application/json'})
     data = "{ \"jsonrpc\": \"2.0\", \"method\": \"VideoPlayer.SeekTime\", \"params\": #{secs}, \"id\": 1 }"
     puts data
     req.body = data
     response = Net::HTTP.new(host, port).start {|http| http.request(req) }
     puts "Response #{response.code} #{response.message}: #{response.body}"
  end


end


c = nil


begin
  c = Brain.new


#  trap("INT") { 
#    if(c)
#      exit
#    else
#      exit
#    end
#  }
  
rescue Exception=>e
#  puts e.backtrace
ensure
  if(c)
    Thread.stop
  end
end



