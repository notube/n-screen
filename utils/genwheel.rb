#!/usr/bin/env ruby

# TellyClub:n-screen danbri$ find images/ -name \*.jpg  -exec convert -define jpeg:size=500x180  {}  -auto-orient  -thumbnail 128x   -unsharp 0x.5  thumbs/{} \;              
# or better 
#  find images/ -name \*.jpg  -exec convert -define jpeg:size=500x180  {}  -auto-orient  -thumbnail x128   -unsharp 0x.5  thumbs/{} \; 
#  ... each thumbnail now has a wixed width

# Quick script to generate bulk of a page suitable for use with http://www.professorcloud.com/mainsite/carousel-integration.htm
#
# 
# Dan Brickley <danbri@danbri.org>

img = `ls thumbs/images/*jpg`

tpl = '<img class="cloudcarousel" src="URL" alt="DESC" title="TITLE" />'

img.each do |i|
  i.chomp!
#  entry = "#{tpl}"
  entry = tpl.clone
  entry.gsub!(/URL/, "#{i}" )
  l = i.clone
  l.gsub!(/_/," ")
  l.gsub!(/thumbs\/images\//,'')
  l.gsub!(/.jpg/,'')
  entry.gsub!(/DESC/, l )
  entry.gsub!(/TITLE/, l )
  puts "#{entry}\n"
end
