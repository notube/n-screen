   require 'webrick'
   require 'webrick/accesslog'
   require 'time'
   include WEBrick
   require 'suggestions.rb'

   class SuggestionServlet < HTTPServlet::AbstractServlet

      def do_OPTIONS(req, res)
# Specify domains from which requests are allowed
        res["Access-Control-Allow-Origin"]="*"

# Specify which request methods are allowed
        res["Access-Control-Allow-Methods"] = "GET, POST"

# Additional headers which may be sent along with the CORS request
# The X-Requested-With header allows jQuery requests to go through
        res["Access-Control-Allow-Headers"]="X-Requested-With, Origin"

# Set the age to 1 day to improve speed/caching.
        res["Access-Control-Max-Age"]="86400"
        res.body=""
        res.status = 200

      end
      def do_POST(req, res)
        return do_GET(req, res)
      end
      def do_GET(req, res)
       begin
         pid = req.query["pid"]
         fmt = req.query["fmt"]
         user_id = req.query["user_id"]
         override_restrictions = req.query["override"]
         if fmt == nil || fmt == ""
           fmt = "html"
         end

         if (pid && pid!="")
           limit = 20
           result = do_query(pid, limit)       
           res['Content-Type'] = 'text/javascript; charset=utf-8'
           if(fmt=="js")
             res.body = JSON.pretty_generate(result)
           else
             res.body = "recommendations2("+JSON.pretty_generate(result)+")"
           end
         end
       rescue Exception=>e
          puts e.inspect
          puts e.backtrace
       end
# Specify domains from which requests are allowed
       res["Access-Control-Allow-Origin"]="*"

# Specify which request methods are allowed
       res["Access-Control-Allow-Methods"] = "GET, POST"

# Additional headers which may be sent along with the CORS request
# The X-Requested-With header allows jQuery requests to go through
       res["Access-Control-Allow-Headers"]="X-Requested-With, Origin"

# Set the age to 1 day to improve speed/caching.
       res["Access-Control-Max-Age"]="86400"
       res["Cache-Control"]="must-revalidate, max-age=86400"
       res["Vary"]="Accept-Encoding"
       t = Time.new
       ts = t.strftime("%a, %d %b %Y %H:%M:%S %Z")
       res["Last-Modified"]=ts
      end

      # cf. http://www.hiveminds.co.uk/node/244, published under the
      # GNU Free Documentation License, http://www.gnu.org/copyleft/fdl.html

      @@instance = nil
      @@instance_creation_mutex = Mutex.new


      def SuggestionServlet.get_instance( config, *options )
         load __FILE__
         SuggestionServlet.new config, *options
      end

      def self.get_instance(config, *options)
         #pp @@instance
         @@instance_creation_mutex.synchronize {
            @@instance = @@instance || self.new(config, *options) }
      end

   end


