/* Copyright Homegear GmbH
 *
 * HomegearWS is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 * 
 * HomegearWS is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 * 
 * You should have received a copy of the GNU Lesser General Public
 * License along with HomegearWS.  If not, see
 * <http://www.gnu.org/licenses/>.
 * 
 * In addition, as a special exception, the copyright holders give
 * permission to link the code of portions of this program with the
 * OpenSSL library under certain conditions as described in each
 * individual source file, and distribute linked combinations
 * including the two.
 * You must obey the GNU Lesser General Public License in all respects
 * for all of the code used other than OpenSSL.  If you modify
 * file(s) with this exception, you may extend this exception to your
 * version of the file(s), but you are not obligated to do so.  If you
 * do not wish to do so, delete this exception statement from your
 * version.  If you delete this exception statement from all source
 * files in the program, then also delete it here.
*/

homegearWsSetTimeout = function (vCallback, nDelay) {
	var oThis = this, aArgs = Array.prototype.slice.call(arguments, 2);
	return setTimeout(vCallback instanceof Function ? function () {
		vCallback.apply(oThis, aArgs);
	} : vCallback, nDelay);
};

homegearWsSetInterval = function (vCallback, nDelay) {
	var oThis = this, aArgs = Array.prototype.slice.call(arguments, 2);
	return setInterval(vCallback instanceof Function ? function () {
		vCallback.apply(oThis, aArgs);
	} : vCallback, nDelay);
};

function HomegearWS(host, port, id, ssl, user, password, log)
{
	this.host = (typeof host !== 'string') ? 'localhost' : host;
	this.port = (typeof port !== 'undefined') ? port : '2001';
	this.id = (typeof id !== 'undefined') ? id : 'HomegearWS';
	if (this.id.length < 10) this.id += "-" + this.getGuid();
	this.ssl = (typeof ssl !== 'undefined') ? (ssl === 'true' || ssl === true) : false;
	this.auth = user ? true : false;
	this.user = (typeof user !== 'undefined') ? user : undefined;
	this.password = (typeof password !== 'undefined' && password !== '') ? password : undefined;
	this.client = null;
	this.authenticated = !this.auth;
	this.onEvent = Array();
	this.onConnected = Array();
	this.onDisconnected = Array();
	this.onReconnected = Array();
	this.onReady = Array();
	this.onError = Array();
	this.peers = Array();
	this.enabled = false;
	this.wasConnected = false;
	this.messageCounter = 1;
	this.requests = {};
	this.connectTimer = null;
	this.reconnectAttempts = 0;
	this.pingTimer = null;
	this.log = typeof(log)  === 'undefined' ? false : log;
}

HomegearWS.prototype.getCounter = function() {
	return this.messageCounter++;
}

HomegearWS.prototype.connect = function() {
	console.log('Connecting (My ID: ' + this.id + ')...');
	this.disconnect();
	this.enabled = true;
	this.connectClient();
}

HomegearWS.prototype.disconnect = function() {
	this.enabled = false;
	if(this.client) {
		this.client.close();
		this.client = null;
	}
}

HomegearWS.prototype.connected = function(callback) {
	if(typeof callback === 'function') this.onConnected.push(callback);
}

HomegearWS.prototype.invokeConnected = function() {
	console.log('Connected.');
	for(i in this.onConnected) {
		if(typeof this.onConnected[i] === 'function') this.onConnected[i]();
	}
}

HomegearWS.prototype.disconnected = function(callback) {
	if(typeof callback === 'function') this.onDisconnected.push(callback);
}

HomegearWS.prototype.invokeDisconnected = function() {
	console.log('Disconnected.');
	for(i in this.onDisconnected) {
		if(typeof this.onDisconnected[i] === 'function') this.onDisconnected[i]();
	}
}

HomegearWS.prototype.reconnected = function(callback) {
	if(typeof callback === 'function') this.onReconnected.push(callback);
}

HomegearWS.prototype.invokeReconnected = function() {
	console.log('Reconnected.');
	for(i in this.onReconnected) {
		if(typeof this.onReconnected[i] === 'function') this.onReconnected[i]();
	}
}

HomegearWS.prototype.error = function(callback) {
	if(typeof callback === 'function') this.onError.push(callback);
}

HomegearWS.prototype.invokeError = function(message) {
	if(typeof message === 'undefined') return;
	console.log('Error: ' + message);
	for(i in this.onError) {
		if(typeof this.onError[i] === 'function') this.onError[i](message);
	}
}

HomegearWS.prototype.ready = function(callback) {
	if(typeof callback === 'function') this.onReady.push(callback);
}

HomegearWS.prototype.invokeReady = function() {
	console.log('Ready.');
	for(i in this.onReady) {
		if(typeof this.onReady[i] === 'function') this.onReady[i]();
	}
}

HomegearWS.prototype.event = function(callback) {
	if(typeof callback === 'function') this.onEvent.push(callback);
}

HomegearWS.prototype.invokeEvent = function(data) {
	if(this.log) console.log('Event:', data);
	for(i in this.onEvent) {
		if(typeof this.onEvent[i] === 'function') this.onEvent[i](data);
	}
}

HomegearWS.prototype.connectClient = function() {
	this.reconnectAttempts++;
	this.client = new WebSocket(((this.ssl) ? 'wss://' : 'ws://') + this.host + (this.port ? ':' + this.port : '') + '/' + this.id, 'server2');
	this.client.onmessage = function(event) {
		packet = JSON.parse(event.data);
		if("auth" in packet) {
			if(packet.auth == 'success') {
				console.log('Authenticated.');
				this.authenticated = true;
				this.subscribePeers();
			} else this.invokeError("Authentication failed.");
		} else if(typeof packet.method !== 'undefined') {
			if(this.log) console.log('RPC call from Homegear: ', packet)
			response = {}
			this.client.send(JSON.stringify(response));
			this.invokeEvent(packet);
		} else if(typeof packet.id !== 'undefined') {
			if(this.log) console.log('Response to id ' + packet.id + ' received: ', packet);
			if(typeof this.requests['c' + packet.id] === 'function')
			{
				this.requests['c' + packet.id](packet);
				delete this.requests['c' + packet.id];
			}
		} else {
			console.log('Unknown packet received: ', packet);
		}
	}.bind(this);
	this.client.onopen = function(event) {
		if(this.auth) {
			request = {
				user: this.user,
				password: this.password
			};
			this.send(JSON.stringify(request));
		} else this.subscribePeers();
		this.invokeConnected();
		if(this.wasConnected) this.invokeReconnected();
		this.reconnectAttempts = 0;
		this.wasConnected = true;
		this.pingTimer = homegearWsSetInterval.call(this, this.pingClient, 15000);
	}.bind(this);
	this.client.onclose = function(event) {
		if(this.auth) this.authenticated = false;
		if(this.enabled)
		{
			this.client = null;
			clearInterval(this.pingTimer);
			clearTimeout(this.connectTimer);
			if (this.reconnectAttempts < 4) this.connectTimer = homegearWsSetTimeout.call(this, this.connectClient, 5000);
			else this.connectTimer = homegearWsSetTimeout.call(this, this.connectClient, 60000);
			this.invokeDisconnected();
		}
	}.bind(this);
	this.client.onerror = function(event)
	{
		this.client = null;
		if(this.auth) this.authenticated = false;
		clearInterval(this.pingTimer);
		clearTimeout(this.connectTimer);
		this.connectTimer = homegearWsSetTimeout.call(this, this.connectClient, 5000);
		this.invokeError(event.data);
	}.bind(this);
}

HomegearWS.prototype.getTwoRandomHeyBytes = function() {
	return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

HomegearWS.prototype.getGuid = function() {
	return this.getTwoRandomHeyBytes() + this.getTwoRandomHeyBytes() + '-' + this.getTwoRandomHeyBytes() + '-' + this.getTwoRandomHeyBytes() + '-' + this.getTwoRandomHeyBytes() + '-' + this.getTwoRandomHeyBytes() + this.getTwoRandomHeyBytes() + this.getTwoRandomHeyBytes();
}


HomegearWS.prototype.addPeers = function(ids) {
	if(!ids.constructor === Array) return;
	var newPeers = Array();
	for(i in ids) {
		var index = this.peers.indexOf(ids[i]);
		if(index == -1) {
			newPeers.push(ids[i]);
			this.peers.push(ids[i]);
		}
	}
	if(!this.isReady() || newPeers.length == 0) return;
	if(this.log) console.log('Subscribing to peers:', newPeers);
	this.send(JSON.stringify({id:this.messageCounter++,method:"subscribePeers",params:[this.id, newPeers]}));
}

HomegearWS.prototype.removePeers = function(ids) {
	if(!ids.constructor === Array) return;
	var peersToRemove = Array();
	for(i in ids) {
		var index = this.peers.indexOf(ids[i]);
		if(index != -1) {
			peersToRemove.push(ids[i]);
			this.peers.splice(index, 1);
		}
	}
	if(!this.isReady() || peersToRemove.length == 0) return;
	this.send(JSON.stringify({id:this.messageCounter++,method:"unsubscribePeers",params:[this.id, peersToRemove]}));
}

HomegearWS.prototype.addPeer = function(id) {
	var index = this.peers.indexOf(id);
	if(index > -1) return;
	this.peers.push(id);
	if(!this.isReady()) return;
	if(this.log) console.log('Subscribing to peer ' + id);
	this.send(JSON.stringify({id:this.messageCounter++,method:"subscribePeers",params:[this.id, [id]]}));
}

HomegearWS.prototype.removePeer = function(id) {
	var index = this.peers.indexOf(id);
	if(index > -1) {
		this.peers.splice(index, 1);
	}
	if(!this.isReady()) return;
	this.send(JSON.stringify({id:this.messageCounter++,method:"unsubscribePeers",params:[this.id, [id]]}));
}

HomegearWS.prototype.isReady = function() {
	return this.client && this.client.readyState === WebSocket.OPEN && this.authenticated;
}

HomegearWS.prototype.subscribePeers = function() {
	if(!this.isReady()) return;
	if(this.log) console.log('Subscribing to peers (2):', this.peers);
	this.send(JSON.stringify({id:this.messageCounter++,method:"subscribePeers",params:[this.id, this.peers]}));
	this.invokeReady();
}

HomegearWS.prototype.pingClient = function() {
	if(!this.isReady()) return;
	if(this.log) console.log('Pinging client...');
	this.send(JSON.stringify({id:this.messageCounter++,method:"logLevel",params:[]}));
}

HomegearWS.prototype.send = function(data) {
	if(this.client) this.client.send(data);
}

HomegearWS.prototype.invoke = function(methodName) {
	if(!this.isReady()) return;
	var counter = this.messageCounter++;
	if(typeof arguments[0] === 'object' && typeof arguments[0].method !== 'undefined') {
		if(typeof arguments[1] === 'function') this.requests['c' + counter] = arguments[1];
		arguments[0].id = counter;
		var request = arguments[0];
		if(this.log) console.log('Invoking RPC method (1): ', request);
		request = JSON.stringify(request);
		this.send(request);
	} else {
		if(typeof methodName !== 'string') return;
		var request = {
			jsonrpc: "2.0",
			method: methodName,
			id: counter
		}
		if(arguments.length > 1 && typeof arguments[1] === 'function') this.requests['c' + counter] = arguments[1];
		if(arguments.length > 2) request.params = Array.prototype.slice.call(arguments, 2);
		if(this.log) console.log('Invoking RPC method (2): ', request);
		request = JSON.stringify(request);
		this.send(request);
	}
}

HomegearWS.prototype.invokeRaw = function(jsonString, counter) {
	if(!this.isReady()) return;
	var counter = this.messageCounter++;
	if(typeof arguments[0] === 'string' && typeof arguments[1] === 'number') {
		if(typeof arguments[2] === 'function') this.requests['c' + counter] = arguments[2];
		var request = arguments[0];
		if(this.log) console.log('Invoking RPC method (1): ', request);
		this.send(request);
	}
}
