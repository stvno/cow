(function ($) {

$.Cow = $.Cow || {};

/**
#Cow.Core

The Cow.Core object. It is automatically constructed from the options
given in the `cow([options])` constructor. 
 */
$.Cow.Core = function(element, options) {
    var self = this;
    this.options = $.extend({}, new $.fn.cow.defaults.core(), options);
    this.events = $({});
    this.peerList = [];
    if(this.options.websocket!==undefined) {
        this.websocket(this.options.websocket);
    }
    element.data('cow', this);
    
    self.bind("disconnected", {widget: self}, self.removeAllPeers);
    self.bind('ws-newList',self._newList);
    self.bind('ws-missingItems',self._missingItems);
    self.bind('ws-wantedList',self._wantedList);
    self.bind('ws-onRequestedItems',self._requestedItems);
};
/**
#Cow.Websocket

The Cow.Websocket object. It is constructed with ws options object in the
cow.`websocket([options])` function or by passing a `websocket:{options}` object in
the `cow()` constructor. 

example: websocket: {url: 'wss://80.113.1.130:443/'}
 */
$.Cow.Websocket = function(core, options) {
    var self = this;
    this.core = core;
    this.options = options;
    this.events = $({});
    //TODO: if connection cannot be established inform the user
    if (!this.ws || this.ws.readyState != 1) //if no connection
    {
        if(this.options.url && this.options.url.indexOf('ws') ==0) {
            this.url = this.options.url;
            this.openws(this.url)
        }
    }

    this.handlers = {
        // Triggers the jQuery events, after the OpenLayers events
        // happened without any further processing
        simple: function(data) {
            this.trigger(data.type);
        }
    };
    
};


/**
#Cow.Peer

The Cow.Peer object. It is constructed from within cow, it contains information
on a connected peer. The core.peerList contains 
a list of Cow.Peer objects, including the special 'me' peer

 */
$.Cow.Peer = function(core, options) {
    var self = this;
    this.core = core;
    this.options = options;
    this.events = $({});
    
    this.handlers = {
        // Triggers the jQuery events, after the OpenLayers events
        // happened without any further processing
        simple: function(data) {
            this.trigger(data.type);
        }
    };
};

$.Cow.Core.prototype = {
    /**
    ##cow.me()
    ###**Description**: returns the peer object representing the client it self
    */    
    me: function(){
        var peer = this.getPeerByID(this.PEERID);    
        return peer;
    },
/**
##cow.websocket([options])
###**Description**: get/set the websocket of the cow
*/
    websocket: function(options) {
        var self = this;
        switch(arguments.length) {
        case 0:
            return this._getWebsocket();
        case 1:
            if (!$.isArray(options)) {
                return this._setWebsocket(options);
            }
            else {
                throw('wrong argument number, only one websocket allowed');
            }
            break;
        default:
            throw('wrong argument number');
        }
    },
    
    _getWebsocket: function() {
        return this.ws;
    },
    _setWebsocket: function(options) {
        var websocket = new $.Cow.Websocket(this, options);
        this.ws=websocket;
    },
/**
##cow.peers([options])
###**Description**: get/set the peers of the cow

**options** an object of key-value pairs with options to create one or
more peers

>Returns: [peer] (array of Cow.Peer) _or_ false

The `.peers()` method allows us to attach peers to a cow object. It takes
an options object with peer options. To add multiple peers, create an array of
peers options objects. If an options object is given, it will return the
resulting peer(s). We can also use it to retrieve all peers currently attached
to the cow.

When adding peers, those are returned. 

=======
A Peer is on object containing:
*/
    peers: function(options) {
      //  console.log('peers()');
        var self = this;
        switch(arguments.length) {
        case 0:
            return this._getPeers();
        case 1:
            if (!$.isArray(options)) {
                return this._addPeer(options);
            }
            else {
                $.each(options,function(i,peer){
                    return self._addPeer(peer);
                })
            }
            break;
        default:
            throw('wrong argument number');
        }
    },
    _getPeers: function() {
        var peers = [];
        $.each(this.peerList, function(id, peer) {
            //SMO: mogelijk nog iets leuks meet peer volgorde ofzo
            peers.push(peer);
        });        
        return peers;
    },
    _addPeer: function(options) {
        var peer = new $.Cow.Peer(this, options);  
        peer.peerID = options.peerID;
        this.peerList.push(peer);
        return peer;
    },
    getPeerByID: function(peerID) {
        var peers = this.peers();
        var peer = false;
        $.each(peers, function(){
            if(this.peerID == peerID) {            
                peer = this;
            }            
        });
        return peer;
    },
    //Return feature collection of peer view extents
/**
##cow.removePeer(cid)
###**Description**: removes the specific peer from the list of peers
*/
    removePeer: function(gonePeerID) {
        //TODO: dit werkt niet, toch doro de hele cid lijst lopen
        var peers = this.peers();
        var delPeer;
        $.each(peers, function(i){
            if(this.options.peerID == gonePeerID) {            
                delPeer = i;
            }            
        });
        if(delPeer >= 0) peers.splice(delPeer,1);
        this.peerList = peers;        
        //TODO: remove peer from d3 layers
        
    },
    removeAllPeers: function() {
        var peers = this.peers();
        $.each(peers, function(i,peer){
            peer = {};
        });
        this.peerList = [];
        //TODO: remove peer from d3 layers
    },

//syncing stuff    
    _newList: function(event,data) {
        console.log('_newList');
        var self = this; //==core
        var payload= data.payload;
        var sender = data.sender;
        if(payload.syncType == 'peers') {
        //check if there are peers you miss
            var wantedList = [];
            var list = payload.list;
            $.each(list, function(key,value) {
                if(self.getPeerByID(value)==false) {
                    wantedList.push(value);
                }
            });
            if(wantedList.length > 0) {
                var message = {};
                message.syncType = 'peers';
                message.list = wantedList;
                self.websocket().sendData(message,'wantedList',sender);
            }
        //check if there are peers you have and he hasn't
            var missingItems = [];
            var peers = self.peers();
            $.each(peers, function(key,value) {
                var missing =true;
                $.each(list,function(lkey,lvalue) {
                    if(value.peerID == lvalue) {
                        missing = false;
                    }
                });
                missingItems.push(value.options)
            });
            if(missingItems.length > 0) {
                var message = {};
                message.syncType = 'peers';
                message.items = missingItems;
                self.websocket().sendData(message,'missingItems',sender);
            }
        }
    },
    _wantedList: function(event,data) {
        console.log('_wantedList');
        var self = this; //==core
        var requestedItems = [];
        var wantedList = data.list;
        if(data.syncType == 'peers') {
            $.each(wantedList,function(key,value){
                var peer = self.getPeerByID(value);
                requestedItems.push(peer.options);
            });
            if(requestedItems.length > 0) {
                var message = {};
                message.syncType = 'peers';
                message.items = requestedItems;
                self.websocket().sendData(message,'requestedItems');
            }
        }
    },
    _missingItems: function(event,data) {
        console.log('_missingItems');
        var self = this; //==core
        var items = data.items;
        if(data.syncType == 'peers') self.peers(items);
    },    
    _requestedItems: function(event,data) {
        console.log('_requestedItems');
        var self = this; //==core
        var items = data.items;
        if(data.syncType == 'peers') self.peers(items);
    },    
        
        
    bind: function(types, data, fn) {
        var self = this;

        // A map of event/handle pairs, wrap each of them
        if(arguments.length===1) {
            var wrapped = {};
            $.each(types, function(type, fn) {
                wrapped[type] = function() {
                    return fn.apply(self, arguments);
                };
            });
            this.events.bind.apply(this.events, [wrapped]);
        }
        else {
            var args = [types];
            // Only callback given, but no data (types, fn), hence
            // `data` is the function
            if(arguments.length===2) {
                fn = data;
            }
            else {
                if (!$.isFunction(fn)) {
                    throw('bind: you might have a typo in the function name');
                }
                // Callback and data given (types, data, fn), hence include
                // the data in the argument list
                args.push(data);
            }

            args.push(function() {
                return fn.apply(self, arguments);
            });

            this.events.bind.apply(this.events, args);
        }

       
        return this;
    },
    trigger: function() {
        // There is no point in using trigger() insted of triggerHandler(), as
        // we don't fire native events
        console.debug('trigger: ' + arguments[0]);
        this.events.triggerHandler.apply(this.events, arguments);
        return this;
    },
    // Basically a trigger that returns the return value of the last listener
    _triggerReturn: function() {
        return this.events.triggerHandler.apply(this.events, arguments);
    },

    destroy: function() {
        this.map.destroy();
        this.element.removeData('cow');
    }
   
};

$.fn.cow = function(options) {
    return this.each(function() {
        var instance = $.data(this, 'cow');
        if (!instance) {
            $.data(this, 'cow', new $.Cow.Core($(this), options));
        }
    });
};

$.fn.cow.defaults = {
    core: function() {
        return {
            websocket: {url: 'wss://localhost:443'}
        };
    }
};

$.Cow.util = {};
// http://blog.stevenlevithan.com/archives/parseuri (2010-12-18)
// parseUri 1.2.2
// (c) Steven Levithan <stevenlevithan.com>
// MIT License
// Edited to include the colon in the protocol, just like it is
// with window.location.protocol
$.Cow.util.parseUri = function (str) {
    var o = $.Cow.util.parseUri.options,
        m = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
        uri = {},
        i = 14;

    while (i--) {uri[o.key[i]] = m[i] || "";}

    uri[o.q.name] = {};
    uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
        if ($1) {uri[o.q.name][$1] = $2;}
    });

    return uri;
};
$.Cow.util.parseUri.options = {
    strictMode: false,
    key: ["source", "protocol", "authority", "userInfo", "user",
            "password", "host", "port", "relative", "path", "directory",
            "file", "query", "anchor"],
    q: {
        name: "queryKey",
        parser: /(?:^|&)([^&=]*)=?([^&]*)/g
    },
    parser: {
        strict: /^(?:([^:\/?#]+:))?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
        loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+:))?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
        }
};
// Checks whether a URL conforms to the same origin policy or not
$.Cow.util.sameOrigin = function(url) {
    var parsed = $.Cow.util.parseUri(url);
    parsed.protocol = parsed.protocol || 'file:';
    parsed.port = parsed.port || "80";

    var current = {
        domain: document.domain,
        port: window.location.port,
        protocol: window.location.protocol
    };
    current.port = current.port || "80";

    return parsed.protocol===current.protocol &&
        parsed.port===current.port &&
        // the current domain is a suffix of the parsed domain
        parsed.host.match(current.domain + '$')!==null;
};
})(jQuery);
