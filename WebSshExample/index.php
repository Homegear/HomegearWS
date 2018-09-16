<?php
require_once("user.php");

if(!$_SERVER['WEBSOCKET_ENABLED']) die('WebSockets are not enabled on this server.');
if($_SERVER['WEBSOCKET_AUTH_TYPE'] != 'session') die('WebSocket authorization type is not set to "session"');

$user = new User();
if(!$user->checkAuth(true)) die();
?>
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8">
		<meta http-equiv="X-UA-Compatible" content="IE=edge">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<meta name="description" content="">
		<meta name="author" content="">
		<title>Homegear WebSSH example</title>
		<link href="bootstrap/css/bootstrap.min.css" rel="stylesheet">
		<link href="css/xterm.css" rel="stylesheet">
		<link href="css/index.css" rel="stylesheet">
		<script src="js/homegear-ws-1.0.0.min.js"></script>
		<script src="js/jquery-3.3.1.slim.min.js"></script>
		<script src="js/xterm.js"></script>
		<script src="js/xterm-fit.js"></script>
		<script src="js/xterm-fullscreen.js"></script>
		<script>
			var homegear;
			var terminal;

			function readCookie(key) {
				var result;
				return (result = new RegExp('(?:^|; )' + encodeURIComponent(key) + '=([^;]*)').exec(document.cookie)) ? (result[1]) : null;
			}

			function homegearReady() {
				$('.hg-alert-error').remove();
				homegear.invoke("setLanguage", null, "en-US");

				homegear.invoke("system.listMethods", function(message) {
					if(message.result) {
						terminal.on("data", function(data) {
							homegear.invoke('websshInput', null, data);
						});

						terminal.on("resize", function(data) {
							homegear.invoke('websshSetScreenSize', null, [terminal.cols, terminal.rows]);
						});

						terminal.blur();
						homegear.invoke('websshSetScreenSize', null, [terminal.cols, terminal.rows]);
						homegear.invoke('websshGetLastOutputs', function(message) {
							for (var i = 0; i < message.result.length; i++) {
							    terminal.write(message.result[i]);
							}
						});
					} else {
						$('.hg-alert-error').remove();
						var errorDiv = $('<div class="hg-alert alert alert-danger alert-dismissible hg-alert-error" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>Homegear WebSSH doesn\'t seem to be running on your Homegear server.</div>');
						$("body").append(errorDiv);
					}
				}, 'websshInput');
			}

			function homegearEvent(message) {
				if(message.method == 'ptyOutput') {
					terminal.write(message.params[0]);
				}
			}

			$(document).ready(function() {
				Terminal.applyAddon(fit);
				Terminal.applyAddon(fullscreen);
				terminal = new Terminal();
				terminal.open(document.getElementById('terminal'));
				terminal.fit();

				var ssl = window.location.protocol == "https:" ? true : false;
				var server = window.location.host.substring(0, window.location.host.lastIndexOf(":"));
				var port = '80';
				if((window.location.host.indexOf("]") != -1 && window.location.host.lastIndexOf(":") > window.location.host.indexOf("]")) || (window.location.host.indexOf("]") == -1 && window.location.host.indexOf(":") != -1)) {
					port = window.location.host.substring(window.location.host.lastIndexOf(":") + 1, window.location.host.length);
				} else if(ssl) {
					port = '443';
				}
				var sessionId = readCookie('PHPSESSID');
				homegear = new HomegearWS(server, port, 'HomegearApp', ssl, sessionId, '', true);
				homegear.ready(homegearReady);
				homegear.error(function(message) {
					if(!message) return;
					$('.hg-alert-error').remove();
					var errorDiv = $('<div class="hg-alert alert alert-danger alert-dismissible hg-alert-error" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>' + message + '</div>');
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
						<li><a href="../HomegearWsExample/">HomegearWS</a></li>
						<li class="active"><a href="#">WebSSH</a></li>
					</ul>
				</div>
			</div>
		</nav>
		<div class="container" role="main">
			<div style="margin-bottom: 20px" id="terminal"></div>
			<footer>
				<p>&copy; 2014-2018 Homegear GmbH</p>
			</footer>
		</div>
		<script type="text/javascript" src="bootstrap/js/bootstrap.min.js"></script>
	</body>
</html>
