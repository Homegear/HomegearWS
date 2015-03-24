# HomegearWS

HomegearWS is a JavaScript class to communicate with Homegear bidirectionally using WebSockets.

## Requirements

* Homegear version >= 0.6.0
* A current web browser

## Usage example

### Create a new HomegearWS object

```
var homegear = new HomegearWS('192.168.0.142', 2001, 'MyTestClient');
```

The first parameter is the IP address or hostname of Homegear, the second the RPC port and the third an arbitrary client id.
If you want to connect to Homegear using SSL and authentication, the object creation looks like this:

```
var homegear = new HomegearWS('192.168.0.142', 2003, 'MyTestClient', true, 'homegear', 'homegear');
```

The fourth parameter enables SSL, the fifth is the username and the last parameter the password.

### Set callback functions

There are three callback functions you can set:

##### ready(callback)

The passed callback function is called when the connection to Homegear has been successfully established. You can also manually check if you're connected to Homegear by calling:

```
homegear.isReady();
```

##### event(callback)

The callback function is called when the Browser received an event from Homegear. One parameter is passed to the function: The JSON-RPC encoded message.

##### error(callback)

The callback function is called on error, e. g. an unexpected disconnect or if authentication failed. It has one parameter: The error message.

### Connect and disconnect

To connect, just call:

```
homegear.connect();
```

When the connection is disrupted, the class automatically tries to reconnect.

To disconnect, call:

```
homegear.disconnect();
```

### Invoke RPC methods

All RPC methods documented in Homegear's RPC reference can be executed by calling "invoke":

```
homegear.invoke(object jsonRPC, function complete);

or

homegear.invoke(string methodName, function complete, parameter1, parameter2, ..., parameterN);
```

The function "complete" is called with the result of the method call. "complete" has one parameter: The response encoded as JSON-RPC. If you're not interested in the response, complete can be 'null'.

### Receive events

To receive device events, you need to add the peers, you want to receive events for. To do that either call:

```
addPeer(peerId)
```

or

```
addPeers([peerId1, peerId2, ..., peerIdN]);
```

To remove the peers again, you can call:

```
removePeer(peerId)
```

or

```
removePeers([peerId1, peerId2, ..., peerIdN]);
```
