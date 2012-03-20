require 'rubygems'
require 'net/http'
require 'uri'
gem 'dbi'
require "dbi"
gem 'dbd-mysql'
require 'pp'


def connect_to_mysql()
        return DBI.connect('DBI:Mysql:db_name', 'mysql', '')
end

## query sql database

def query(q) 
        begin
          dbh = connect_to_mysql()
          query = dbh.prepare(q)
          query.execute()
          arr = []
          while row = query.fetch() do
            arr.push(row.to_a)
          end
          dbh.commit
          query.finish  
        end
        return arr
end


## utility
## just fix up any missing spaces etc

def process_date(ddtt)
   #puts "\nPROCESS_DATE"
  if(ddtt)
    text_date=""
    text_date = ddtt.strftime("%A, %d %B, %Y at %H:%m%p")
    return text_date
  else
    return nil
  end
end


## get some related suggestions

def do_query(pid,limit)
   #puts "\nDO_QUERY"
       if limit == nil || limit.to_i==0
         limit = 100
       end
       # this is the object returned 
       rec_results = {}

       suggestions,pid_title = get_suggestions(pid)
       rec_results["suggestions"]=suggestions

       rec_results["pid"] = pid
       rec_results["title"] = "Related to #{pid_title}"

       #puts "pid #{pid}"

       return rec_results
end


def get_suggestions(pid)
       #puts "\nGET_SUGGESTIONS"
       q1 = "select distinct core_title from pids where pid='#{pid}' limit 1"
       initial_pid_title = ""
       explanation = ""
       results1 = query(q1)
       results1.each do |r1|
                  explanation = "People who watched #{r1[0]} also watched this"
                  initial_pid_title= r1[0]
       end

       q = "select distinct  pids.* from similarity, pids, series where prog_num1='#{pid}' 
and pids.pid=prog_num2 and series.pid=pids.pid group by series_crid  order by tanimoto desc limit 30"

       suggestions = []
       suggestions2 = []
       pids = []
       series_titles=[]

       results = query(q)
       results.each do |r0|
                  sugg = {}
                  pid = r0[4]
                  desc = r0[5]
                  ct = r0[9]
                  st = r0[10]
                  dt = r0[6]
                  chan = r0[8]

                  if(ct)
                    sugg["core_title"] = ct.strip
                  end
                  if(st)
                    sugg["series_title"] = st.strip
                  end
                  sugg["pid"] = pid
                  sugg["description"] = desc
                  sugg["date_time"] = dt
                  sugg["channel"] = chan
                  img = "http://dev.notu.be/2011/04/danbri/crawler/images/#{pid}_512_288.jpg"

                  sugg["image"]=img
                  sugg["explanation"]=explanation

                  suggestions2.push(sugg)

       end
       #pp suggestions2

       return suggestions2,initial_pid_title
end


## search for text

def do_search(text, limit)

       if(!limit)
         limit = 30
       end

       q = "select distinct pids.* from pids where core_title like '%#{text}%' or series_title like '%#{text}%' or description like '%#{text}%' limit #{limit}"

       puts q

       suggestions = []
       suggestions2 = []
       pids = []
       series_titles=[]

       results = query(q)
       results.each do |r0|
                  sugg = {}
                  pid = r0[4]
                  desc = r0[5]
                  ct = r0[9]
                  st = r0[10]
                  dt = r0[6]
                  chan = r0[8]

                  if(ct)
                    sugg["core_title"] = ct.strip
                  end
                  if(st)
                    sugg["series_title"] = st.strip
                  end
                  sugg["pid"] = pid
                  sugg["description"] = desc
                  sugg["date_time"] = dt
                  sugg["channel"] = chan
                  img = "http://dev.notu.be/2011/04/danbri/crawler/images/#{pid}_512_288.jpg"

                  sugg["image"]=img

                  suggestions2.push(sugg)

       end

       return suggestions2

end



# get some random starting points

def get_random(limit)
         pids = []
         if limit == nil || limit.to_i==0
           limit = 50
         end

         # this is the object returned 
         rec_results = {}

## we want some suggestions
## we get one from each series and then randomise those
## gives better results than pure random

         si = 767 #distinct series
         arr = limit.times.map{ rand(si) } 
         arr = arr.sort_by{ rand }.slice(0...12)
         st = arr.join(",")

         suggestions = []
         q0 = "select distinct series_crid from just_series where id in (#{st})"
         puts q0
         arr = []
         results3 = query(q0)
         results3.each do |r3|
                  p = r3[0]
                  arr.push("'#{p}'")
         end
         txt = arr.join(",")

         q = "select pids.* from pids,series where series.pid=pids.pid and series.series_crid in (#{txt}) group by series_crid"

         puts q
         results4 = query(q)
         results4.each do |r4|
                  sugg = {}
                  ddtt = r4[6]
                  crid = r4[3]
                  pid = r4[4]
                  pids.push(pid)
                  desc = r4[5]
                  prog1 = r4[1].to_s
                  chan = r4[8]
                  ct = r4[9].to_s
                  st = r4[10].to_s

                  text_date = process_date(ddtt)

                  if(ddtt)
                      sugg["date_time"] = ddtt
                  end
                  if(text_date)
                      sugg["text_date"] = text_date
                  end
                  if(chan)
                      sugg["channel"] = chan
                  end

                  sugg["core_title"] = ct.strip
                  sugg["series_title"] = st.strip
                  sugg["pid"] = pid
                  sugg["description"] = desc
                  img = "http://dev.notu.be/2011/04/danbri/crawler/images/#{pid}_512_288.jpg"

                  sugg["image"] = img

                  suggestions.push(sugg)

       end
       rec_results["suggestions"]=suggestions
       rec_results["title"]="Shuffled"

       return rec_results,pids
end
