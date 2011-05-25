
function last_chunk(str){

  var ch = "";
  str = str.replace("Category:","")
  if(str.match("#")){
    ch = str.replace(/.*(\/|\#)(.*?)$/g,"$2");
  }else{
    ch = str.replace(/.*(\#|\/)(.*?)$/g,"$2");
  }

  ch = ch.replace(/([A-Z])(?![A-Z])/g," $1");
//  ch = ch.replace(/(?![A-Z])([A-Z])/," $2");
  ch = ch.replace(/_/g," ");
  return ch;
}

function chunk(foo){
    arr2 = foo.split("|");
    res = [];
    for(var j=0;j<arr2.length;j++){
     ch =   last_chunk(arr2[j]);
     //console.log(ch);
     res.push(ch);
    }
    //console.log("xxxx "+res.join(":"));
    return res.join(": ");
}


function clean_up(explanation){
//  arr = explanation.split(",");
  arr = explanation;
  results = [];

  for(var i=0;i<arr.length;i++){

    pair = arr[i][0];
    num = arr[i][1];
    if(num<50){
      if(!pair.match("http://www.w3.org/1999/02/22-rdf-syntax-ns#type") && !pair.match("wikiPageUsesTemplate") && !pair.match("wordnet_type")  && !pair.match("http://www.w3.org/2002/07/owl#Thing") && !pair.match("http://dbpedia.org/ontology/Work")){
        results.push(chunk(pair));
      }
    }

/*
    if(!foo.match("http://www.w3.org/1999/02/22-rdf-syntax-ns#type") && !foo.match("wikiPageUsesTemplate") && !foo.match("wordnet_type")  && !foo.match("http://www.w3.org/2002/07/owl#Thing") && !foo.match("http://dbpedia.org/ontology/Work")){
      foo = foo.replace(/\'/g,"");
      results.push(chunk(foo));
    }
*/
  }

//console.log(results.join("....."));
  return results.join(", ");

}

