<?php
class User
{
    private $hg;

    public function __construct()
    {
        ini_set('session.gc_maxlifetime', 5);
        session_start();
        $this->hg = new \Homegear\Homegear();
    }

    public function checkAuth($redirectToLogin)
    {
        $authorized = false;
        try
        {
            $keysSet = isset($_COOKIE['accessKey']) && isset($_COOKIE['refreshKey']);
            if($keysSet)
            {
                $username = $this->hg->verifyOauthKey($_COOKIE['accessKey']);
                if(!$username)
                {
                    $keys = $this->hg->refreshOauthKey($_COOKIE['refreshKey']);
                    setcookie("accessKey", $keys['access_token']);
                    setcookie("refreshKey", $keys['refresh_token']);
                    $username = $keys['user'];
                }
                if($username)
                {
                    $_SESSION['authorized'] = true;
                    $_SESSION['user'] = $username;
                    $authorized = true;
                }
            }
        }
        catch(\Homegear\HomegearException $e)
        {
            $authorized = false;
        }

        if(!$authorized)
        {
            $this->logout();
            if($redirectToLogin) header("Location: signin.php?url=".$_SERVER["REQUEST_URI"]);
            die("unauthorized");
        }

        return $authorized;
    }

    public function login($username, $password)
    {
        try
        {
            if(hg_auth($username, $password) === true)
            {
                $keys = $this->hg->createOauthKeys($username);
                setcookie("accessKey", $keys['access_token']);
                setcookie("refreshKey", $keys['refresh_token']);
                $_SESSION['authorized'] = true;
                $_SESSION["user"] = $username;
                return true;
            }
        }
        catch(\Homegear\HomegearException $e)
        {
        }
        return false;
    }

    public function logout()
    {
        if(ini_get("session.use_cookies"))
        {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        session_destroy();
    }
}
?>
