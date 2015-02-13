/* Copyright 2015 Sathya Laufer
 *
 * Homegear is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Homegear is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Homegear.  If not, see <http://www.gnu.org/licenses/>.
 *
 * In addition, as a special exception, the copyright holders give
 * permission to link the code of portions of this program with the
 * OpenSSL library under certain conditions as described in each
 * individual source file, and distribute linked combinations
 * including the two.
 * You must obey the GNU General Public License in all respects
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

function HomegearWS(host, port, id, ssl, user, password)
{
	this.host = (typeof host !== 'string') ? 'localhost' : host;
	this.port = (typeof port !== 'undefined') ? port : '2001';
	this.id = (typeof id !== 'undefined') ? id : 'HomegearWS';
	this.id += "-" + this.getGuid();
	this.ssl = (typeof ssl !== 'undefined') ? (ssl === 'true' || ssl === true) : false;
	this.auth = user ? true : false;
	this.user = (typeof user !== 'undefined') ? user : undefined;
	this.password = (typeof password !== 'undefined') ? password : undefined;
	this.client = null;
	this.server = null;
	this.clientAuthenticated = !this.auth;
	this.serverAuthenticated = !this.auth;
	this.onEvent = null;
	this.onReady = null;
	this.onError = null;
	this.peers = Array();
	this.enabled = false;
	this.messageCounter = 0;
	this.requests = {};
}

HomegearWS.prototype.connect = function() {
	this.enabled = true;
	this.connectClient();
	this.connectServer();
}

HomegearWS.prototype.disconnect = function() {
	this.enabled = false;
	if(this.server) this.server.close();
	if(this.client) this.client.close();
}

HomegearWS.prototype.connectServer = function() {
	this.server = new WebSocket(((this.ssl) ? 'wss://' : 'ws://') + this.host + ':' + this.port + '/' + this.id, "client");
	this.server.onmessage = function(event) {
		response = JSON.parse(event.data);
		if(!("auth" in response)) {
			request = {}
			this.server.send(JSON.stringify(request));
			if(typeof this.onEvent === 'function') this.onEvent(response);
		} else if(response.auth == "success") {
			this.serverAuthenticated = true;
			homegearWsSetTimeout.call(this, this.subscribePeers, 1000);
		} else if(typeof this.onError === 'function') this.onError("Authentication failed.");
	}.bind(this);
	this.server.onopen = function(event) {
		if(this.auth) {
			request = {
				user: this.user,
				password: this.password
			};
			this.server.send(JSON.stringify(request));
		}
		else homegearWsSetTimeout.call(this, this.subscribePeers, 1000);
	}.bind(this);
	this.server.onclose = function(event) {
		if(this.auth) this.serverAuthenticated = false;
		if(this.enabled)
		{
			homegearWsSetTimeout.call(this, this.connectServer, 5000);
			if(typeof this.onError === 'function') this.onError("Server disconnected.");
		}
	}.bind(this);
	this.server.onerror = function(event)
	{
		if(this.auth) this.serverAuthenticated = false;
		homegearWsSetTimeout.call(this, this.connectServer, 5000);
		if(typeof this.onError === 'function') this.onError(event.data);
	}.bind(this);
}

HomegearWS.prototype.connectClient = function() {
	this.client = new WebSocket(((this.ssl) ? 'wss://' : 'ws://') + this.host + ':' + this.port + '/' + this.id, 'server');
	this.client.onmessage = function(event) {
		response = JSON.parse(event.data);
		if("auth" in response) {
			if(response.auth == 'success') this.clientAuthenticated = true;
			else if(typeof this.onError === 'function') this.onError("Authentication failed.");
		}
		else if(typeof response.id !== 'undefined' && typeof this.requests['c' + response.id] !== 'undefined')
		{
			this.requests['c' + response.id](response);
			delete this.requests['c' + response.id];
		}
	}.bind(this);
	this.client.onopen = function(event) {
		if(this.auth) {
			request = {
				user: this.user,
				password: this.password
			};
			this.client.send(JSON.stringify(request));
		}
	}.bind(this);
	this.client.onclose = function(event) {
		if(this.auth) clientAuthenticated = false;
		if(this.enabled)
		{
			homegearWsSetTimeout.call(this, this.connectClient, 5000);
			if(typeof this.onError === 'function') this.onError("Client disconnected.");
		}
	}.bind(this);
	this.client.onerror = function(event)
	{
		if(this.auth) clientAuthenticated = false;
		homegearWsSetTimeout.call(this, this.connectClient, 5000);
		if(typeof this.onError === 'function') this.onError(event.data);
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
	this.client.send(JSON.stringify({method:"subscribePeers",params:[this.id, newPeers]}));
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
	this.client.send(JSON.stringify({method:"unsubscribePeers",params:[this.id, peersToRemove]}));
}

HomegearWS.prototype.addPeer = function(id) {
	var index = this.peers.indexOf(id);
	if(index > -1) return;
	this.peers.push(id);
	if(!this.isReady()) return;
	this.client.send(JSON.stringify({method:"subscribePeers",params:[this.id, [id]]}));
}

HomegearWS.prototype.removePeer = function(id) {
	var index = this.peers.indexOf(id);
	if(index > -1) {
		this.peers.splice(index, 1);
	}
	if(!this.isReady()) return;
	this.client.send(JSON.stringify({method:"unsubscribePeers",params:[this.id, [id]]}));
}

HomegearWS.prototype.isReady = function() {
	return this.server.OPEN && this.client.OPEN && this.serverAuthenticated && this.clientAuthenticated;
}

HomegearWS.prototype.subscribePeers = function() {
	if(!this.isReady()) return;
	this.client.send(JSON.stringify({method:"subscribePeers",params:[this.id, this.peers]}));
	if(typeof this.onReady === 'function') this.onReady();
}

HomegearWS.prototype.invoke = function(methodName) {
	if(!this.isReady()) return;
	var counter = this.messageCounter++;
	if(typeof arguments[0] === 'object' && typeof arguments[0].method !== 'undefined') {
		if(typeof arguments[1] === 'function') this.requests['c' + counter] = arguments[1];
		arguments[0].id = counter;
		this.client.send(JSON.stringify(arguments[0]));
	} else {
		if(typeof methodName !== 'string') return;
		var request = {
			jsonrpc: "2.0",
			method: methodName,
			id: counter
		}
		if(arguments.length > 1 && typeof arguments[1] === 'function') this.requests['c' + counter] = arguments[1];
		if(arguments.length > 2) request.params = Array.prototype.slice.call(arguments, 2);
		this.client.send(JSON.stringify(request));
	}
}
