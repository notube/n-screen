//expects date in iso 8601 and cobbles together a version taht will work for our purposes

function fix_date(d){

//var d = "2009-07-01 22:00:00+01:00";
//var d2 = "2009-10-01 22:00:00Z";

  var myregexp = new RegExp(/(\d{4})-(\d{2})-(\d{2})[ tT](.*?)[Z\+](.*)/);
  var mymatch = myregexp.exec(d)

  var bst = false;

  if(mymatch[5] && mymatch[5]!=""){
    tz = mymatch[5].replace(":","");
    d3 = mymatch[2]+"/"+mymatch[3]+"/"+mymatch[1]+" "+mymatch[4]+" GMT+"+tz;
    bst = true;
  }else{
    d3 = mymatch[2]+"/"+mymatch[3]+"/"+mymatch[1]+" "+mymatch[4];
  }

//alert(d3);

//d3 = "07/01/2009 22:00:00 GMT+0100";

  var date1 = new Date(d3);

  var y = date1.getFullYear();
  //if(bst){y = date1.getUTCFullYear();}

  var m = date1.getMonth()+1;
  //if(bst){m = date1.getUTCMonth();}
  if(m<10){m="0"+m}

  var da = date1.getDate();
  //if(bst){da = date1.getUTCDate();}
  if(da<10){da="0"+da}

  var h = date1.getHours();
  if(bst){h = date1.getUTCHours();}
  if(h<10){h="0"+h}

  var mi = date1.getMinutes();
  if(mi<10){mi="0"+mi}

  var date_formatted = y+'-'+m+'-'+da+'/'+h+'-'+mi+'-00';

  return date_formatted;
}
