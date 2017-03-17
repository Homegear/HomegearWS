<?php
require_once("user.php");

function ipIsV6($ip) : int
{
	return strpos($ip, ':') !== false;
}

function clientInPrivateNet() : bool
{
	if(substr($_SERVER['REMOTE_ADDR'], 0, 7) == '::ffff:' && strpos($_SERVER['REMOTE_ADDR'], '.') !== false) $_SERVER['REMOTE_ADDR'] = substr($_SERVER['REMOTE_ADDR'], 7);

	if(ipIsV6($_SERVER['REMOTE_ADDR']))
	{
		$ip6 = substr($_SERVER['REMOTE_ADDR'], 0, 6);
		$ip2 = substr($ip6, 0, 2);

		return $ip6 == 'fe80::' || $ip2 == 'fc' || $ip2 == 'fd';
	}
	else
	{
	    $clientIp = ip2long($_SERVER['REMOTE_ADDR']);
	    $bcast10 = ip2long('255.0.0.0');
	    $nmask10 = ip2long('10.0.0.0');
	    $bcast172 = ip2long('255.240.0.0');
	    $nmask172 = ip2long('172.16.0.0');
	    $bcast192 = ip2long('255.255.0.0');
	    $nmask192 = ip2long('192.168.0.0');
	    return (($clientIp & $bcast10) == $nmask10) || (($clientIp & $bcast172) == $nmask172) || (($clientIp & $bcast192) == $nmask192);
	}
}

if((!isset($_SERVER['HTTPS']) || $_SERVER['HTTPS'] != "on") && !clientInPrivateNet()) die('unauthorized');

$user = new User();
if(!$user->checkAuth(true)) die();

ini_set('session.gc_maxlifetime', 5);
?>
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8">
		<meta http-equiv="X-UA-Compatible" content="IE=edge">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<meta name="description" content="">
		<meta name="author" content="">
		<title>HomegearWS example</title>
		<link href="bootstrap/css/bootstrap.min.css" rel="stylesheet">
		<link href="css/index.css" rel="stylesheet">
		<script type="text/javascript" src="js/homegear-ws-0.0.1.js"></script>
		<script type="text/javascript" src="js/jquery.2.1.4.min.js"></script>
		<script type="text/javascript">
			var homegear;

			function readCookie(key) {
			    var result;
			    return (result = new RegExp('(?:^|; )' + encodeURIComponent(key) + '=([^;]*)').exec(document.cookie)) ? (result[1]) : null;
			}

			function homegearReady() {
				$('.hg-alert-socket-error').remove();
				homegear.invoke("listDevices", function(message) {
					$('#log').html(JSON.stringify(message.result, null, '\t'));
					if(message.result.constructor !== Array) return;
					var ids = [];
					for(var i = 0; i < message.result.length; i++) {
						ids.push(message.result[i].ID);
					}
					homegear.addPeers(ids);
				}, false, [ 'ID', 'ADDRESS', 'FAMILY', 'TYPE' ]);
			}

			function homegearEvent(message) {
				$('#log').html(JSON.stringify(message, null, '\t'));
			}

			$(document).ready(function() {
				var ssl = window.location.protocol == "https:" ? true : false;
				var server = window.location.host.substring(0, window.location.host.lastIndexOf(":"));
				var port = '80';
				if((window.location.host.indexOf("]") != -1 && window.location.host.lastIndexOf(":") > window.location.host.indexOf("]")) || (window.location.host.indexOf("]") == -1 && window.location.host.indexOf(":") != -1)) {
					port = window.location.host.substring(window.location.host.lastIndexOf(":") + 1, window.location.host.length);
				} else if(ssl) {
					port = '443';
				}
				var sessionId = readCookie('PHPSESSID');
				homegear = new HomegearWS(server, port, 'HomegearApp', ssl, sessionId);
				homegear.ready(homegearReady);
				homegear.error(function(message) {
					if(!message) return;
					$('.hg-alert-socket-error').remove();
					var errorDiv = $('<div class="hg-alert alert alert-danger alert-dismissible hg-alert-socket-error" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>' + message + '</div>');
					$("body").append(errorDiv);
				});
				homegear.event(homegearEvent);
				homegear.connect();
			});
		</script>
	</head>
	<body style="height: 100%">
		<nav class="navbar navbar-inverse navbar-fixed-top">
			<div class="container">
				<div class="navbar-header">
					<button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target="#navbar" aria-expanded="false" aria-controls="navbar">
						<span class="sr-only">Menu</span>
						<span class="icon-bar"></span>
						<span class="icon-bar"></span>
						<span class="icon-bar"></span>
					</button>
					<a class="navbar-brand" href="#">Homegear</a>
				</div>
				<div id="navbar" class="navbar-collapse collapse">
					<ul class="nav navbar-nav">
						<li class="active"><a href="#">Home</a></li>
					</ul>
				</div>
			</div>
		</nav>
		<div class="container" role="main">
			<pre id="log"></pre>
			<footer>
				<p class="pull-right"><a href="#">Nach oben</a></p>
				<p>&copy; 2014-2015 Homegear UG</p>
			</footer>
		</div>
		<script type="text/javascript" src="bootstrap/js/bootstrap.min.js"></script>
	</body>
</html>
