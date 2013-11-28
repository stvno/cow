####Messaging Protocol

COW uses a message protocol to send over its data. A message is a JSON object with at least an _action_ and a _payload_ and possibly a _target_. There are two main sets of messages. The first are used to keep track who is who on the websocket (network topology). These are low level messages and shouldn't be messed with. The second are higher level ones that handle the syncing of data in cow.

There are two types of messages: targeted and broadcast. The first is meant for a specific peer, the second for everybody.

**websocket**

*connected* (targeted)

This message is send by the websocket server to the peer once a connection has been established between de server and the peer. It contains the internal CONNECTIONID used by the server to keep track who is who. This CONNECTIONID is the position of the peer in the connections array on the server. This is a read only message sent by the server and never by a client.

```
{
    "action" : "connected",
    "payload" : {
        "cid" : CONNECTIONID
    }
}
```

*newPeer* **TODO: rewrite to spec**

This message is send by the peer once the connection to the server is established to tell the other peers (and the server) what its CONNECTIONID and UNIQUEPEERID are. This way other peers will be able to find him once the network topology changes. The server uses this information to send the targeted messages to the correct peer.

```
{
    "action" : "newPeer",
    "payload" : {
        "cid" : CONNECTIONID,
        "uid" : UNIQUEPEERID
    }
}
```


*peerGone* (targeted)

This message is send by the websocket server to a peer once a connection is lost between another peer and the server. It contains the internal connection id (LOSTPEERID) of the peer that lost connection and the new position in the connections array of the current peer (NEWCONNECITONID).  This is a read only message sent by the server and never by a client.

```
{
    "action" : "peerGone",
    "payload": { 
        "peerCid" : LOSTPEERID,
        "newCid" : NEWCONNECTIONID
    }
}
```


*updatePeers*

This message is send by a peer once the *peerGone* message has been received. It contains the UNIQUEPEERID as reference for the other peers and the NEWCONNECTIONID to reorder the network topology.

```
{
    "action" : "updatePeers",
    "payload": { 
        "uid" : UNIQUEPEERID,
        "connectionID" : NEWCONNECTIONID
    }
}
```

