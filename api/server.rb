   require 'SuggestionServlet'
   require 'SearchServlet'
   require 'RandomServlet'
   require 'date'
   require 'webrick'
   require 'webrick/accesslog'
   include WEBrick
   require 'uri'
   require 'open-uri'
   require 'net/http'
   require 'rubygems'
   require 'json/pure'


   require 'thread'
   require 'pp'

   root_dir = "."
   http_dir = File.expand_path(root_dir)

   File.open(http_dir + "/WEBrickLog/webrick_ruby.pid", "w") do |f|
      f.puts(Process.pid)
   end

   # cf. http://microjet.ath.cx/webrickguide/html/Logging.html
   webrick_log_file = File.expand_path(http_dir + "/WEBrickLog/webrick.log")
   #webrick_log_file = '/dev/null'  # disable logging
   webrick_logger = WEBrick::Log.new(webrick_log_file, WEBrick::Log::DEBUG)

   access_log_stream = webrick_logger
   access_log = [[ access_log_stream, WEBrick::AccessLog::COMBINED_LOG_FORMAT ]]

   system_mime_table = WEBrick::HTTPUtils::load_mime_types('/etc/mime.types')
   system_mime_table.store('rhtml', 'text/html')   # add a mime type for .rhtml files
   system_mime_table.store('php', 'text/html')
   system_mime_table.store('rb', 'text/plain')
   system_mime_table.store('pid', 'text/plain')
   #pp system_mime_table.sort_by { |k,v| k }

   server = WEBrick::HTTPServer.new(
     :BindAddress     =>    "localhost",
     :Port            =>    9090,
     :DocumentRoot    =>    http_dir,
     :FancyIndexing   =>    true,
     :MimeTypes       =>    system_mime_table,
     :Logger          =>    webrick_logger,
     :AccessLog       =>    access_log
   )

   server.config.store(:DirectoryIndex, server.config[:DirectoryIndex] << "default.htm")
   #pp server.config




   # cf. http://snippets.dzone.com/posts/show/5208
   class TimeServlet < HTTPServlet::AbstractServlet

      def do_GET(req, res)
         res['Content-Type'] = 'text/html'
         res.status = 200
         res.body = "<html>Time: #{Time.now.to_s}</html>" + "\n"
      end

      # cf. http://www.hiveminds.co.uk/node/244, published under the
      # GNU Free Documentation License, http://www.gnu.org/copyleft/fdl.html

      @@instance = nil
      @@instance_creation_mutex = Mutex.new

      def self.get_instance(config, *options)
         #pp @@instance
         @@instance_creation_mutex.synchronize { 
            @@instance = @@instance || self.new(config, *options) }
      end

   end


   # cf. http://ttripp.blogspot.com/2007/01/fun-with-http.html
   class PostDumper < WEBrick::HTTPServlet::AbstractServlet
  
      # Reload file for each request, instantly
      # updating the server with code changes 
      # without needing a restart.

      def PostDumper.get_instance( config, *options )
         load __FILE__
         PostDumper.new config, *options
      end

      # cf. http://www.hiveminds.co.uk/node/244, published under the
      # GNU Free Documentation License, http://www.gnu.org/copyleft/fdl.html

      @@instance = nil
      @@instance_creation_mutex = Mutex.new

      def self.get_instance(config, *options)
         #pp @@instance
         @@instance_creation_mutex.synchronize { 
            @@instance = @@instance || self.new(config, *options) }
      end

      def do_GET( request, response )
         response.status = 200
         response['Content-Type'] = "text/plain"
         response.body = dump_request( request )
      end
  
      def do_POST( request, response )
         response.status = 200
         response['Content-Type'] = "text/plain"
         response.body = dump_request( request )
         response.body << request.body
      end
  
      def dump_request( request )
         request.request_line << "\r\n" <<
         request.raw_header.join( "" ) << "\r\n"
      end
   end

   server.mount("/suggest", SuggestionServlet, {:FancyIndexing=>true})
   server.mount("/search", SearchServlet, {:FancyIndexing=>true})
   server.mount("/random", RandomServlet, {:FancyIndexing=>true})

   # handle signals
   %w(INT).each do |signal|
      trap(signal) { server.shutdown }
   end

   server.start

