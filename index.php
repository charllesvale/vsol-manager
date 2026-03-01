<?php
/**
 * VSOL Manager Pro - Entry Point
 * Verifica sessão do MK-Auth antes de servir o SPA React.
 * Acesso sem login redireciona para /admin/login.php
 */

session_start();

// MK-Auth armazena o login do admin em $_SESSION['admin_login']
if (!isset($_SESSION['admin_login']) || empty($_SESSION['admin_login'])) {
    $proto     = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host      = $_SERVER['HTTP_HOST'];
    header('Location: ' . $proto . '://' . $host . '/admin/login.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>VSOL Manager Pro</title>
  <link rel="stylesheet" href="./assets/index.css" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./assets/index.js"></script>
</body>
</html>
