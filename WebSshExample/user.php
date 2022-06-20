<?php

class User
{
    public function __construct()
    {
        session_start(array('name' => 'PHPSESSIDADMIN'));
    }

    public function checkAuth($redirectToLogin)
    {
        if (array_key_exists('SSL_CLIENT_VERIFY', $_SERVER) && $_SERVER['SSL_CLIENT_VERIFY'] == "SUCCESS" && !isset($_SESSION["authorized"])) {
            // CERT-Auth
            $_SESSION['authorized'] = true;
            $_SESSION['user'] = $_SERVER['SSL_CLIENT_S_DN_CN'];
        }

        if (array_key_exists('CLIENT_AUTHENTICATED', $_SERVER) && $_SERVER['CLIENT_AUTHENTICATED'] == "true" &&
            array_key_exists('CLIENT_VERIFIED_USERNAME', $_SERVER) && $_SERVER['CLIENT_VERIFIED_USERNAME']) {
            $_SESSION['authorized'] = true;
            $_SESSION['user'] = $_SERVER['CLIENT_VERIFIED_USERNAME'];
        }

        $authorized = (isset($_SESSION["authorized"]) && $_SESSION["authorized"] === true && isset($_SESSION["user"]));
        if (!$authorized && $redirectToLogin) {
            header('Location: signin.php');
            die('unauthorized');
        }
        hg_set_user_privileges($_SESSION['user']);
        if (\Homegear\Homegear::checkServiceAccess('web-ssh') !== true) return -2;

        return $authorized;
    }

    public function login($username, $password)
    {
        if (hg_auth($username, $password) === true) {
            hg_set_user_privileges($username);
            if (\Homegear\Homegear::checkServiceAccess("web-ssh") !== true) return -2;
            $_SESSION["authorized"] = true;
            $_SESSION["user"] = $username;
            return 0;
        }
        return -1;
    }

    public function logout()
    {
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        session_destroy();
    }
}
