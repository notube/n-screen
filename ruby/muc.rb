require 'rubygems'
require 'json/pure'
require 'xmpp4r'
require 'xmpp4r/roster'
require 'time'
require 'pp'
require 'net/http'
#require 'xmpp4r/muc/helper/mucclient.rb'
require 'xmpp4r/client'
require 'xmpp4r/muc'
require 'time'
require 'nokogiri'
require 'net/http'



#	lib/xmpp4r/muc/helper/mucclient.rb 

# this programme does this:
# * when something asks to play a programme, sends the message to the TV
# * when something asks to be friends with the brain
# sends a list of other friends of the brain, plus what's playing on the TV

class Brain
  include Jabber

  zid = ""      
  current_programme_id = ""
  current_programme_pid = ""
  current_programme_nick = ""
  current_programme_source_id = ""
  current_programme = ""
  current_programme_title = ""
  current_programme_image = ""
  current_programme_description = ""
  REDUX_URL = ''
  CREDENTIALS = {
  'username' => '',
  'password' => '',
  'dologin' => 1
  }
  history=nil

#  attr_accessor :jid, :password, :fake_roster, :current_programme, :current_programme_title, 
#:current_programme_id, :history, :zid, :server

  attr_accessor :jid, :password, :fake_roster, :current_programme, :current_programme_title, :current_programme_source_id, :current_programme_nick, :current_programme_pid, :current_programme_id, :history, :zid, :server, :current_programme_image, :current_programme_description

  attr_reader :client, :roster, :get_url, :valid_user, :muc

  def initialize
    self.server = "jabber.notu.be"
    self.zid = "telly3"
    self.jid = "#{self.zid}@#{server}" #@@fixme for your server
    puts "jid #{self.jid}"
    self.password = ""
    @client = Client.new(self.jid)
    self.fake_roster = {}
#    Jabber::debug = true
    self.history = {}
    connect
  end


  def connect
    @client.connect
    @accept_subscriptions = true
    @client.auth(@password)
    @client.send(Presence.new.set_type(:available))

    #the "roster" is our bot contact list
#    @roster = Roster::Helper.new(@client)

#    start_presence_callback
#    start_subscription_request_callback

     # create multi-user chat
     puts "about to create MUC"
     @muc = MUC::SimpleMUCClient.new(@client)

     #to do something with the messages we receive
     puts "about to start message callback"
     start_message_callback
     start_join_callback

     room_name = "default_muc"
     create_room_with_name(room_name,self.zid)

     #not ideal@@
     @muc.say("{'type':'tv'}")
     puts "sending status 1"
     @muc.say(get_status())

  end

#- create_room_with_name(room_name)
#- join_room(room_name, jid)
#- create_or_join_room(room_name, jid)
#- room_exists(room_name)
#- send_room_msg(room_name,msg)
#- send_person_message(jid, msg)
#- change_nick(jid, new_nick)

  def start_join_callback
    @muc.on_join{ |time,nick|
      #not ideal@@
      @muc.say("{'type':'tv'}",nick)
      puts "sending status 2"
      @muc.say(get_status())# not sure we need this, because of history
    }

  end

  def start_message_callback
    puts "starting message callback"
    @muc.on_private_message { |time,nick,text|
      puts (time || Time.new).strftime('%I:%M') + " <#{nick}> #{text}"

      jid_fr = nick
      data = text
      puts "data #{data}"

      programme_url = nil
      puts data
      begin
        j = JSON.parse(data)
        programme_url = j["video"]
      rescue JSON::ParserError=>e
        puts "parser error!"
      end
      puts "prog url #{programme_url}"

      m = "url incorrect"

      if programme_url
# at this point one can find or derive the playable url from other data
# hence the laboured 'history' construction
          puts "got prog url"
          self.current_programme_source_id = j["id"]
          self.current_programme_id = j["id"]
          self.current_programme_pid = j["pid"]
          self.current_programme_nick = j["nick"]
          self.current_programme_title = j["title"]
          self.current_programme = j["video"]
          self.current_programme_image = j["image"]
          self.current_programme_description = j["description"]
          m = nil
          if(!self.history[programme_url])
            u = CREDENTIALS['username']
            p = CREDENTIALS['password']  
            puts "no id in history #{u} #{p}"
#            self.history[programme_url]=programme_url
#            m = self.history[programme_url]
            if(valid_user(CREDENTIALS['username'],CREDENTIALS['password']))
              puts "getting redux"
              m = get_url(programme_url)
              puts "m is #{m}"
              if(m)
                self.history[programme_url]=m
               #self.current_programme = m
              end
            else
              puts "invalid redux user"
            end
          else
            m = self.history[programme_url]
          end
#          self.current_programme = m
      
          puts "M is ...#{m},,"
          if(m && m!="")
            begin
#talk to the tv
          
              puts "PLAYING #{m}"
          
#look for indications of seconds for skipping in
              /\#(.*)/ =~ m
              secs = nil
              if(Regexp.last_match)
                secs = Regexp.last_match[1]
                m.gsub!(/\#.*/,"")
              end
            
# post to XBMC
              post(m)

              if(secs && secs !=0)
                seek(secs)
              end
              
# really there should be some error handling here @@
# but in reality we have to wait for it to timeout
# maybe send a provisional 'ok'?
               
#talk to everyone else
              status = get_status()   

              puts "sending status 3"
              @muc.say(status)

            rescue Exception=>e
              puts "err #{e}"
              if(e.to_s.match("Connection refused"))

                puts "matched err condition [1]"
              
                self.current_programme_title= "#{self.current_programme_title} failed to play "

                puts "sending status 4"
                status = get_status()
                @muc.say(status)

              end
#             puts e.backtrace
              if(e.to_s.match("execution expired"))
                
                puts "matched err condition [2]"
              
                self.current_programme_title= "#{self.current_programme_title} failed to play"

                status = get_status()
                puts "sending status 5"
                @muc.say(status)

              end
            end

          else

            self.current_programme_title = "#{self.current_programme_title} failed to play"

            status = get_status()

            puts "sending status 6"
            @muc.say(status)

          end
                
      end



    }
  end

  def create_room_with_name(room_name,nick)
    puts "creating room with name #{room_name} and joining with nick #{nick}"
    @muc.join(Jabber::JID.new("#{room_name}@conference.#{self.server}/#{nick}"))
  end


  def valid_user(u,p)
    res = Net::HTTP.post_form(URI.parse("#{REDUX_URL}/user"), {
      'username' => u,
      'password' => p,
      'dologin' => 1
    })
    puts res.body
    doc = Nokogiri::XML(res.body)
    valid = doc.search("body/div/a").text.strip =~ /Logged in!/
    puts valid
    if(valid==0)
      return true
    else
      return false
    end
  end

  def get_url(url)    
   begin
      u = URI.parse(url)
      res = Net::HTTP.post_form(u, CREDENTIALS)
      puts res.body
      case res
      when Net::HTTPSuccess
        #str = File.open("redux_eg.html")
        #doc = Nokogiri::XML(str)
        doc = Nokogiri::XML(res.body)
        #puts doc
        txt = doc.xpath('//a[contains(text(), "Download")]/@href')[0]
        t = txt.to_s.gsub(/original.*/,"")
        re =  "http://g.bbcredux.com#{t}flash.flv"
        puts "found url #{re}"
        return re
      else
        return nil
      end
    rescue Exception => f
      puts f
      puts "YYYYYY problem"
      return nil  
    end

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


  def get_status()
      status = {}
      status["video"]=self.current_programme
      status["title"]=self.current_programme_title
      status["id"]=self.current_programme_source_id
      status["pid"]=self.current_programme_pid
      status["nick"]=self.current_programme_nick
      status["image"]=self.current_programme_image
      status["description"]=self.current_programme_description
      status_str = JSON.pretty_generate(status)
      
      puts "status: #{status_str}"
      return status_str
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
  puts "error #{e}"
  puts e.backtrace
ensure
  if(c)
    Thread.stop
  end
end



