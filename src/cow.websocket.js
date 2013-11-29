$.Cow.Websocket.prototype = {
    
    _onOpen: function() {
        
    },
    _onMessage: function(message) {
        console.log(message);
        var core = this.obj.core;
        var data = JSON.parse(message.data);
        var sender = data.sender;
        var PEERID = core.PEERID; 
        var action = data.action;        
        var payload = data.payload;    
        var target = data.target;
        switch (action) {
        //Messages related to the websocket connection
            //websocket confirms connection by returning the unique peerID (targeted)
            case 'connected':
                this.obj._onConnect(payload)
            break;
            
            //websocket tells everybody a peer has gone, with ID: peerID
            case 'peerGone':
                this.obj._onPeerGone(payload);
            break;      
        
        //Messages related to the syncing protocol
            //a new peer has arrived and gives a list of its items
            case 'newList':
                if(sender != PEERID) {
                    this.obj._onNewList(payload,sender)
                }
            break;
            
            //you just joined and you receive a list of items the others want (targeted)
            case 'wantedList':
                if(target == PEERID) {
                    this.obj._onWantedList(payload)
                }
            break;
            
            //you just joined and receive the items you are missing (targeted)
            case 'missingItems':
                if(target == PEERID) {
                    this.obj._onMissingItems(payload)
                }   
            break;
            
            //a new peer has arrived and sends everybody the items that are requested in the *wantedList*
            case 'requestedItems':
                if(sender != PEERID) {
                    this.obj._onRequestedItems(payload)
                }
            break;
            
        }
    },
    _onClose: function(event) {
        var code = event.code;
        var self = this;
        var reason = event.reason;
        var wasClean = event.wasClean;
        
        this.close();
        this.obj.core.removeAllPeers();
        this.obj.core.trigger('ws-disconnected');    
        //TODO: doe iets slimmers, hij hangt nu af van de global variable 'core'....
        var restart = function(){
            try{
                core.ws.closews();
            }
            catch(err){
                console.warn(err);
            }
            core.ws.openws();
        }
        setTimeout(restart,5000);
    },
    _onError: function(event, error) {
        //alert(error);
        console.warn('error in websocket connection: ' + event.type);
    },
    sendData: function(data, action, target){
        //TODO: check if data is an object
        var message = {};        
        message.sender = this.core.PEERID;
        message.target = target;
        message.action = action;
        message.payload = data;
        if (this.ws && this.ws.readyState == 1){
            this.ws.send(JSON.stringify(message));
        }
    },
    _onConnect: function(payload) {
        console.log(payload.peerID);
        var self = this;        
        self.core.PEERID = payload.peerID;  
        var me = self.core.peers(payload)
        this.core.trigger('ws-connected',payload); 
        //initiate peer-sync
        var message = {};
        message.syncType = 'peers';
        message.list = [self.core.PEERID];
        this.sendData(message, 'newList');
    },
    
    //A peer has disconnected, remove it from your peerList and
    //send your new CID to the remaining peers
    _onPeerGone: function(payload) {
        var peerGone = payload.gonePeerID;    
        this.core.removePeer(peerGone);        
        this.core.trigger('ws-peerGone',payload); 
    },
    //BEGIN Syncing messages
    _onNewList: function(payload,sender) {
    
        //TODO: alphapeer check
        
        var message = {};
        message.sender = sender;
        message.payload = payload;
        this.core.trigger('ws-newList',message); 
    },
    
    _onWantedList: function(payload) {
        this.core.trigger('ws-wantedList',payload); 
    },
    
    _onMissingItems: function(payload) {
        this.core.trigger('ws-missingItems',payload); 
    },
    
    _onRequestedItems: function(payload) {
        this.core.trigger('ws-onRequestedItems',payload); 
    },
    // END Syncing messages
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
        this.events.triggerHandler.apply(this.events, arguments);
        return this;
    },
    // Basically a trigger that returns the return value of the last listener
    _triggerReturn: function() {
        return this.events.triggerHandler.apply(this.events, arguments);
    },
    
    
    closews: function() {
        if (this.ws){
            this.ws.close();    
            this.ws = null;
        }
        else
            throw('No websocket active');
    },
    openws: function(url) {
        var core = this.core;
        var ws = new WebSocket(this.url, 'connect');
        ws.onopen=this._onOpen;
        ws.onmessage = this._onMessage;
        ws.onclose = this._onClose;    
        ws.onerror = this._onError;
        ws.obj = this;
        this.ws =ws;
    }
    
};