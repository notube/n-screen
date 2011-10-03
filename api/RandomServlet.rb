   require 'webrick'
   require 'webrick/accesslog'
   include WEBrick
   require 'suggestions.rb'

   class RandomServlet < HTTPServlet::AbstractServlet

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
         crid = req.query["crid"]
         pid = req.query["pid"]
         fmt = req.query["fmt"]
         user_id = req.query["user_id"]
         override_restrictions=req.query["override"]
         if fmt == nil || fmt == ""
           fmt = "json"
         end
         puts "ok"
         limit = 50
         result,crids = get_random(limit)

         if (fmt=="json")
             res['Content-Type'] = 'text/javascript; charset=utf-8'
             res.body = "random("+JSON.pretty_generate(result)+")"
         end
         if (fmt=="js")
             res['Content-Type'] = 'text/javascript; charset=utf-8'
             res.body = JSON.pretty_generate(result)
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
       res["Cache-Control"]="no-cache, no-store, max-age=0, must-revalidate"

      end

      # cf. http://www.hiveminds.co.uk/node/244, published under the
      # GNU Free Documentation License, http://www.gnu.org/copyleft/fdl.html

      @@instance = nil
      @@instance_creation_mutex = Mutex.new


      def RandomServlet.get_instance( config, *options )
         load __FILE__
         RandomServlet.new config, *options
      end

      def self.get_instance(config, *options)
         #pp @@instance
         @@instance_creation_mutex.synchronize {
            @@instance = @@instance || self.new(config, *options) }
      end

   end


