$.Cow.FeatureStore.prototype = {
    /**
        New functions, not yet implemented
    */

    featureitems: function(options,source) {
    },
    syncFids: function(fids) {
    },
    /**
        Deprecated functions
    */
	/**
##featurestore.items([options])
###**Description**: get/set the items of the cow

**options** an object of key-value pairs with options to create one or
more items

>Returns: [item] (array of Cow.Item) _or_ false

The `.items()` method allows us to attach items to a cow object. It takes
an options object with item options. To add multiple items, create an array of
item options objects. If an options object is given, it will return the
resulting item(s). We can also use it to retrieve all items currently attached
to the cow.

When adding items, those are returned. 

*/
	items: function(options) {
		var self = this;
		switch(arguments.length) {
        case 0:
            return this._getItems();
        case 1:
            if (!$.isArray(options)) {
                return this._addItem(options);
            }
            else {
				return $.core(options, function(item) {
                    return self._addItem(item);
                })
            }
            break;
        default:
            throw('wrong argument number');
        }
	},
	_getItems: function() {
        var items = [];
        $.each(this.itemList, function(id, item) {
            items.push(item);
        });        
        return items;
    },
	_addItem: function(options) {
		var items = this.items();
		var newitem = {"options": options};
		this.itemList.push(newitem);
		return newitem;
	},

	//only for updates from outside
	updateItem: function(options){
		var self = this;
		var items = this.items();
		var isnew = 1;
		$.each(items, function(i, item){
			if (item.options.key == options.key){
				isnew = 0;
				item.options = options; //slightly bizarre syntax
				self.core.localdbase().update(item.options);
			}
		});
		if (isnew == 1) {
			self._addItem(options);
			core.localdbase().addFeat(options);
		}
		console.log('FS updateItem: storeChanged');
		self.core.trigger('storeChanged');
	},
	getItemByIid: function(iid) {
		var items = this.items();
		var item;
		$.each(items, function(i, obj){
			if(obj.options.key == iid) {			
				item = obj.options;
			}			
		});
		return item;
	},
	/**
	##cow.removeItem(iid)
	###**Description**: removes the specific item from the list of items
	*/
	removeItem: function(iid) {
		
		var items = this.items();
		var delItem;
		$.each(items, function(i, item){
			if (item.options.key == iid){
				var d = new Date();
				var timestamp = d.getTime();
				if (item.options.status != 'deleted')
					item.options.status = 'deleted';
				else
					item.options.status = '';
				item.options.updated = timestamp;
				self.core.localdbase().update(item.options);
				//send to world
				var message = JSON.stringify(item.options);
				self.core.websocket().sendData(message, "updateFeature");
			}
		});
		console.log("FS removeItem: storeChanged");
		self.core.trigger('storeChanged');
	},
	//Inject features from other local source into featurestore
	injectFeatures: function(type, features){
		var self = this;
		$.each(features, function(i, feature){
			var item = {};
			var d = new Date();
			var timestamp = d.getTime();
			feature.properties.type = type;
			//feature.properties.icon = self.core.current_icon; //TODO TT: not nice
			//feature.properties.linecolor = self.core.current_linecolor;
			//feature.properties.fillcolor = self.core.current_fillcolor;
			//feature.properties.polycolor = self.core.current_polycolor;
			item.key = self.core.UID + "#" + timestamp;
			feature.properties.key = item.key;
			feature.properties.storename = self.core.activeHerd;
			item.uid = self.core.UID;
			item.created = timestamp;
			item.updated = timestamp;
			item.status = '';
			item.feature = JSON.parse(geojson_format.write(feature));
			//Add item to own stack
			self.items(item);
			console.log('FS injectFeatures: storeChanged');
			core.trigger('storeChanged');
			//Send item to world
			var message = JSON.stringify(item);
			core.websocket().sendData(message, "newFeature");
			core.localdbase().addFeat(item);
		});
	},
	//feature has been drawm, add it to featurestore including some extra data
	saveLocalFeat: function(feature){
		var self = this;
		var item = {};
		var d = new Date();
		var timestamp = d.getTime();
		feature.properties.icon = self.core.current_icon; //TODO TT: not nice
		feature.properties.linecolor = self.core.current_linecolor;
		feature.properties.fillcolor = self.core.current_fillcolor;
		feature.properties.polycolor = self.core.current_polycolor;
		item.key = self.core.UID + "#" + timestamp;
		feature.properties.key = item.key;
		feature.properties.store = self.core.activeHerd;
		item.uid = self.core.UID;
		item.created = timestamp;
		item.updated = timestamp;
		item.status = '';
		
		item.feature = feature;
		//Add item to own stack
		self.items(item);
		//Send item to world
		var message = JSON.stringify(item);
		core.websocket().sendData(message, "newFeature");
		core.localdbase().addFeat(item);
		console.log("FS _onSketchComplete: storeChanged");
		core.trigger('storeChanged');
	},

	//feature properties have been locally changed 
	updateLocalFeat: function(feature){
		var self = this;
		var d = new Date();
		var timestamp = d.getTime();
		$.each(self.itemList, function(i, obj){
				if (obj.options.key == feature.properties.key){
					//obj.options.feature = JSON.parse(geojson_format.write(feature));
					obj.options.feature = feature;
					obj.options.updated = timestamp;
					self.core.localdbase().update(obj.options);
					var message = JSON.stringify(obj.options);
					self.core.websocket().sendData(message, "updateFeature");
				}
		});
		console.log('FS updateLocalFeat: storeChanged');
		self.core.trigger('storeChanged');
	},
	/*Obs
	//finished with modifying a features geometry
	_onFeatureModified: function(evt, feature){
		var self = evt.data.widget;
		//var items = this.items();
		var d = new Date();
		var timestamp = d.getTime();
		
		$.each(self.itemList, function(i, obj){
				if (obj.options.key == feature.properties.key){
					obj.options.feature = feature;
					obj.options.updated = timestamp;
					self.core.localdbase().update(obj.options);
					var message = JSON.stringify(obj.options);
					self.core.websocket().sendData(message, "updateFeature");
				}
		});
		console.log('FS _onFeatureModified: storeChanged');
		self.core.trigger('storeChanged');
	},
	*/
	//putFeatures - feature(s) incoming from world 
	putFeatures: function(itemlist){
		var self = this;
		$.each(itemlist, function(i,item){
			//check if feature is new or updated
			if (self.getItemByIid(item.key))
				var localItem = self.getItemByIid(item.key);
				if (localItem && item.updated > localItem.updated) //incoming item is newer
					self.updateItem(item);
			else
				self._addItem(item);
			core.localdbase().addFeat(item);
		});
		console.log('FS putFeatures: storeChanged');
		core.trigger('storeChanged');
	},
	clear: function(){
	    this.itemList = [];
	},
	//fill - items go from localdbase to featurestore
	fill: function(itemlist){
		var self = this;
		$.each(itemlist, function(i,item){
			self._addItem(item);
		});
		console.log('FS fill: storeChanged');
		self.core.trigger('storeChanged'); //This will reload the map
		
		//Send our featurelist to the world for syncing
		var fids = self.getIdList();
		var message = fids;
		self.loaded = true;
		var message = {};
        message.fids = fids;
        message.storename = self.core.activeHerd;
        self.core.websocket().sendData(message, "newPeerFidList");
	},
	
	//request - incoming request from world
	//find features corresponding to request and send
	requestFeatures: function(fidlist){
		var pushlist = [];
		$.each(this.items(), function(i, item){
				var local_feature = item.options;
				$.each(fidlist, function(j,rem_val){
						if (rem_val == local_feature.key)
							pushlist.push(local_feature);
				});
		});
		return pushlist;
	},
	getAllFeatures: function(){
		return this.items();
	},
	deleteAllFeatures: function(){
		var items = this.items();
		var self = this;
		$.each(items, function(i, item){
				var d = new Date();
				var timestamp = d.getTime();
				if (item.options.status != 'deleted')
				{
					item.options.status = 'deleted';
					item.options.updated = timestamp;
				}
				self.core.localdbase().update(item.options);
		});
		//TODO: need to notify other peers instantly about removal?
		//Now it is delayed until next connection is made
		console.log('FS deleteAllFeatures: storeChanged');
		self.core.trigger('storeChanged');

	},
	//return list with only keys and update time to inform other peers
	getIdList: function(){
		var idlist = [];
		var items = this.items();
		$.each(items, function(i){
				var iditem = {};
				iditem.key = items[i].options.key;
				iditem.updated = items[i].options.updated;
				iditem.status = items[i].options.status;
				idlist.push(iditem);
		});
		return idlist;
	},
	/**
	compareIdList - compares incoming fidlist with fidlist from current stack based on timestamp and status
					generates 2 lists: requestlist and pushlist
	**/
	compareIdList: function(fidlist){
		var syncMessage = {};
		var copyof_rem_list = [];
		syncMessage.requestlist = [];
		syncMessage.pushlist = [];
		//Prepare copy of remote fids as un-ticklist, but only for non-deleted items
		if (fidlist){
			$.each(fidlist, function(i,val){
				if (val.status != 'deleted')
					copyof_rem_list.push(val.key);	
			});
			$.each(this.items(), function(i,loc_val){
					var local_item = loc_val.options;
					var found = -1;
					$.each(fidlist, function(j,rem_val){
							//in both lists
							if (rem_val.key == local_item.key){
								found = 1;
								//local is newer
								if (rem_val.updated < local_item.updated)
									syncMessage.pushlist.push(local_item);
								//remote is newer
								else if (rem_val.updated > local_item.updated)
									syncMessage.requestlist.push(rem_val.key);
								//remove from copyremotelist
								var tmppos = $.inArray(local_item.key,copyof_rem_list);
								if (tmppos >= 0)
									copyof_rem_list.splice(tmppos,1);
							}
					});
					//local but not remote and not deleted
					if (found == -1 && local_item.status != 'deleted'){
						syncMessage.pushlist.push(local_item);
					}
			});
		}
		//Add remainder of copyof_rem_list to requestlist
		$.each(copyof_rem_list, function(i,val){
			syncMessage.requestlist.push(val);	
		});
		return syncMessage;
	}
};
