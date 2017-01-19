//----====|| NOTES ||====----\\
// If there is new bursty data, buffer it, allow different views within it. keep caps and stuff in mind and high performance
// If there is no new data, trickle buffered data into view, direction of trickle based on on position of the view
// eval the above 2 things at a user defined interval
//should i use copywithin instead of splice?
//----===================----\\
var streambuffer = function(objConfig){ 'use strict'; var self=this;
//----====|| CONFIG ||====----\\
	if(typeof objConfig === 'undefined'){
		//set all defaults
		var objConfig={
			 size:10000
			,interval:500
			,newest:{size:20}
			,oldest:false
			,stream:true
			,fnEndRecords:function(){console.log('no more records to stream in');}
		};
	}else{
		//check config and add defaults
		if(typeof objConfig.size==='undefined'){objConfig.size=10000;}
		if(typeof objConfig.interval==='undefined'){objConfig.interval=500;}
		if(typeof objConfig.newest==='undefined'){objConfig.newest=false;}
		if(typeof objConfig.oldest==='undefined'){objConfig.oldest=false;}
		if(typeof objConfig.stream==='undefined'){objConfig.stream=true;}
		if(typeof objConfig.fnEndRecords==='undefined'){objConfig.fnEndRecords=function(){console.log('no more records to stream in');}}
	}
	if(objConfig.newest!==false){ 
			this.newest={}; 
			this.newest.data=[];
			this.newest.size=objConfig.newest.size;
		}
	if(objConfig.oldest!==false){ 
		this.oldest={}; 
		this.oldest.data=[];
		this.oldest.size=objConfig.oldest.size;
	}
//----====|| PRIVATE ||====----\\
	//create the primary array for the cache, using a fixed length for speed/memory efficiency
	this.arrCache = new Array(objConfig.size);
//----====|| PROPERTIES ||====----\\
	this.config = objConfig;
	this.stats = {total:0,current:0,last:0,count:0,avg:0,tsUpdated:0};
	this.tsFirst = 0;
	this.tsLast = 0;
	this.travel=0;
//----====|| METHODS ||====----\\
	this.setConfig = function(){};
	this.addData = function(arrData){
		//we MUST work with arrays, if it isn't stuff it into one.
		if(arrData.constructor !== Array){ arrData=[arrData]; }
		var intCount = arrData.length;
		self.stats.total = self.stats.total + intCount;
		self.stats.last = self.stats.current;
		self.stats.current = intCount;
		self.stats.count++;
		self.stats.avg=self.stats.total/self.stats.count;
		self.tsLast=Date.now();
		//if there is more than the limit, just trim and set it as the cache
		if(intCount >= self.config.size){ arrData.splice(self.config.size); self.arrCache=arrData; }
		//if it's one record, just do it
		else if(intCount === 1){ self.arrCache.pop(); self.arrCache.unshift(arrData[0]); }
		//otherwise need to move some chunks around
		else{
			//decide how many records will be kept after new ones are inserted.
			var intKeep = self.config.size-intCount;
			//create the new array from what's new and what's kept
			self.arrCache = arrData.concat(self.arrCache.splice(0,intKeep));
		}
		//need to set each of the views based on their defined positions
			//set the by position
		fnSetViews(arrData);
		//if this is the first set of data to be added start the streaming per interval
		if(self.stats.total === intCount){ 
			self.tsFirst=Date.now();
			//console.log('streaming');
			fnStreamRecords();
		}
	};
	
	var fnStreamRecords=function(){
		//if there are new records this time around, no need to mess with advancing
		var tsNow = Date.now();
		//data hasnt been added since last interval so start advancing
		//console.log(tsNow, self.config.interval, self.stats.tsUpdated+self.config.interval, self.stats.tsUpdated);
		if(tsNow > self.stats.tsUpdated+self.config.interval && self.stats.tsUpdated!==0){ fnSetViews([]); }
		//else{ self.travel=0; }
		self.stats.tsUpdated=tsNow;
		//call this function again at the set time	
		if(self.config.stream===true){ setTimeout(function(){ fnStreamRecords(); }, self.config.interval);}
	};
	var fnSetViews=function(arrData){
		//console.log('set views');
		//verify there's room to advance the records
		if(arrData.length===0 && self.stats.total > self.newest.size+self.travel+1){ 
			//console.log(self.newest.data);
			self.travel++; 
			//intMove=self.travel; 
		}
		//no more data to show, so leave buffer where they are
		if(arrData.length===0 && self.travel===0 && self.config.stream===true){ 
			//console.log('EOF');
			self.config.fnEndRecords(); 
			self.config.stream=false; 
		}
		else{
			if(self.newest!==false){ 
				if(self.stats.total < self.newest.size){ 
					///console.log('set newest to incoming data, total smaller than view');
					self.newest.data=self.arrCache.slice(0,self.stats.total); 
				}
				else{ 
					for(i=0;i<self.newest.size;i++){ self.newest.data[i]=self.arrCache[i+self.travel]; }
					//self.newest.data=self.arrCache.slice(self.travel,self.newest.size+self.travel); 
					//console.log(self.newest.data,self.travel,self.newest.size+self.travel,self.arrCache.length);
				}
			}
			if(self.config.oldest!==false){
				if(self.stats.total < self.oldest.size){ self.oldest.data=self.arrCache.slice(0,self.stats.total); }
				else if(self.stats.total < self.config.size){ self.oldest.data=self.arrCache.slice(self.stats.total-self.oldest.size+self.travel,self.oldest.size+self.travel); }
				else{ self.oldest.data=self.arrCache.slice(self.config.size-self.oldest.size+self.travel); }	 
			}
		}
	};
	this.stop=function(){ this.config.stream=false; };
	//start the trickle over with whats in cache
	this.restart=function(){ this.travel=0; this.config.stream=true; fnStreamRecords(); }
	this.go=function(){
		//dont want to fire this unless it was stopped, lets be sure
		if(this.config.stream===false){
			this.config.stream=true;
			fnStreamRecords();
		}
	};
};
if (typeof module !== 'undefined' && module.exports){module.exports = streambuffer;}