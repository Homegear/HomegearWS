<?php
require_once("user.php");

if (!$_SERVER['WEBSOCKET_ENABLED']) die('WebSockets are not enabled on this server.');
if ($_SERVER['WEBSOCKET_AUTH_TYPE'] != 'session') die('WebSocket authorization type is not set to "session"');

if (file_exists(\Homegear\Homegear::WRITEABLE_DATA_PATH . "defaultPassword.txt") && (file_exists('/var/lib/homegear/admin-ui/public/index.php') || file_exists('/var/lib/homegear/admin-ui/public/index.hgs'))) {
    header('Location: /admin/');
    exit(0);
}

$user = new User();

if (!$_SESSION["authorized"]) {
    if (!$user->checkAuth(true)) die("Unauthorized.");
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="">
    <meta name="author" content="">
    <title>Homegear WebSSH example</title>
    <link href="css/xterm.css" rel="stylesheet">
    <link href="css/index.css" rel="stylesheet">
    <script src="js/homegear-ws.min.js"></script>
    <script src="js/jquery.slim.min.js"></script>
    <script src="js/xterm.js"></script>
    <script src="js/xterm-addon-fit.js"></script>
    <script type="module">
        let homegear;
        let terminal;

        function readCookie(key) {
            var result;
            return (result = new RegExp('(?:^|; )' + encodeURIComponent(key) + '=([^;]*)').exec(document.cookie)) ? (result[1]) : null;
        }

        function homegearReady() {
            $('.hg-alert-error').remove();
            homegear.invoke("setLanguage", null, "en-US");

            homegear.invoke("system.listMethods", function (message) {
                if (message.result) {
                    terminal.onData((data) => {
                        homegear.invoke('websshInput', null, data);
                    });

                    terminal.onResize((data) => {
                        homegear.invoke('websshSetScreenSize', null, [terminal.cols, terminal.rows]);
                    });

                    terminal.blur();
                    homegear.invoke('websshSetScreenSize', null, [terminal.cols, terminal.rows]);
                    homegear.invoke('websshGetLastOutputs', function (message) {
                        for (var i = 0; i < message.result.length; i++) {
                            terminal.write(message.result[i]);
                        }
                    });
                } else {
                    $('.hg-alert-error').remove();
                    var errorDiv = $('<div class="hg-alert alert alert-danger alert-dismissible hg-alert-error" role="alert">Homegear WebSSH doesn\'t seem to be running on your Homegear server.</div>');
                    $("body").append(errorDiv);
                }
            }, 'websshInput');
        }

        function homegearEvent(message) {
            if (message.method == 'ptyOutput') {
                terminal.write(message.params[0]);
            }
        }

        function resizeTerminal() {
            const MINIMUM_COLS = 2;
            const MINIMUM_ROWS = 1;

            const core = terminal._core;

            if (core._renderService.dimensions.actualCellWidth === 0 || core._renderService.dimensions.actualCellHeight === 0) {
                return;
            }

            const scrollbarWidth = terminal.options.scrollback === 0 ? 0 : core.viewport.scrollBarWidth;

            const parentElementStyle = window.getComputedStyle(terminal.element.parentElement);
            const parentElementHeight = parseInt(parentElementStyle.getPropertyValue('height'));
            const parentElementWidth = Math.max(0, parseInt(parentElementStyle.getPropertyValue('width')));
            const elementStyle = window.getComputedStyle(terminal.element);
            const elementPadding = {
                top: parseInt(elementStyle.getPropertyValue('padding-top')),
                bottom: parseInt(elementStyle.getPropertyValue('padding-bottom')),
                right: parseInt(elementStyle.getPropertyValue('padding-right')),
                left: parseInt(elementStyle.getPropertyValue('padding-left'))
            };
            const elementPaddingVer = elementPadding.top + elementPadding.bottom;
            const elementPaddingHor = elementPadding.right + elementPadding.left;
            const availableHeight = parentElementHeight - elementPaddingVer;
            const availableWidth = parentElementWidth - elementPaddingHor - scrollbarWidth;
            const geometry = {
                cols: Math.max(MINIMUM_COLS, Math.floor(availableWidth / core._renderService.dimensions.actualCellWidth)),
                rows: Math.max(MINIMUM_ROWS, Math.floor(availableHeight / core._renderService.dimensions.actualCellHeight))
            };

            terminal.resize(geometry.cols, geometry.rows);
        }

        $(document).ready(function () {
            terminal = new Terminal();
            console.log(typeof (FitAddon), FitAddon);
            terminal.open(document.getElementById('terminal'));
            resizeTerminal();

            const ssl = window.location.protocol == "https:" ? true : false;
            const server = window.location.host.substring(0, window.location.host.lastIndexOf(":"));
            let port = '80';
            if ((window.location.host.indexOf("]") != -1 && window.location.host.lastIndexOf(":") > window.location.host.indexOf("]")) || (window.location.host.indexOf("]") == -1 && window.location.host.indexOf(":") != -1)) {
                port = window.location.host.substring(window.location.host.lastIndexOf(":") + 1, window.location.host.length);
            } else if (ssl) {
                port = '443';
            }
            const sessionId = readCookie('PHPSESSIDADMIN');
            homegear = new HomegearWS(server, port, 'hg-web-ssh', ssl, sessionId, '');
            homegear.ready(homegearReady);
            homegear.error(function (message) {
                if (!message) return;
                $('.hg-alert-error').remove();
                const errorDiv = $('<div class="hg-alert alert alert-danger alert-dismissible hg-alert-error" role="alert">' + message + '</div>');
                $("body").append(errorDiv);
            });
            homegear.event(homegearEvent);
            homegear.connect();
        });
    </script>
</head>
<body>
<div style="width: calc(100vw - 20px); height: calc(100vh - 20px);" id="terminal"></div>
</body>
</html>
