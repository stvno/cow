/*$.Cow.ConnectWidget = {
init: function(){
var widget = $('#connect');
var cow = $('#cow').data('cow');
cow.events.bind('connected',{}, this._onConnect);
},
_onConnect: function() {
}
}
*/
(function($) {
$.widget("cow.PeersWidget", {
    options: {
        // The cow.core instance
        core: undefined,
        name: '#myname'
    },
    
    toggleFullScreen: function(element) {
    
    },
    
    connectedPeersList: function(peerObj){
        var self = this;
        switch(arguments.length) {
        case 0:
            return this._connectedPeers;
            break;
        case 1:
            var existing = false;
            for (var i=0;i<this._connectedPeers.length;i++){
                if (this._connectedPeers[i].id == peerObj.id) {
                    existing = true; //Already a member
                    return this._connectedPeers[i];
                }
            }
            if (!existing)
                this._connectedPeers.push(peerObj); //Adding to the list
            return peerObj;
            break;
        default:
            throw('wrong argument number');
        }
    },
    removeConnection: function(id){
        for (var i=0;i<this._connectedPeers.length;i++){
            if (this._connectedPeers[i].id == id) {
                this._connectedPeers.splice(i,1); //Remove from list
                return;
            }
        }
    },
    _create: function() {
        var core;
        var self = this;        
        var element = this.element;
       
        

    },
    _destroy: function() {
        this.element.removeClass('ui-dialog ui-widget ui-widget-content ' +
                                 'ui-corner-all')
            .empty();
    }
    }
    );

})(jQuery);


