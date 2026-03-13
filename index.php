<?php
/**
 * VSOL Manager Pro - Entry Point (com iframe isolado do CSS do MK-Auth)
 */
if (file_exists(dirname(__FILE__) . '/addons.class.php')) {
    include(dirname(__FILE__) . '/addons.class.php');
} elseif (file_exists('/opt/mk-auth/include/addons.inc.hhvm')) {
    include('/opt/mk-auth/include/addons.inc.hhvm');
} else {
    die('Aguarde o processamento do MK-Auth, acesse novamente em alguns instantes!');
}

if (session_status() === PHP_SESSION_NONE) {
    session_name('mka');
    if (!isset($_SESSION)) session_start();
}

if (!isset($_SESSION['MKA_Logado'])) {
    exit('Acesso negado... <a href="/admin/">Fazer Login</a>');
}

$usuario = isset($_SESSION['MKA_Usuario'])
    ? $_SESSION['MKA_Usuario']
    : (isset($_SESSION['MM_Usuario']) ? $_SESSION['MM_Usuario'] : 'Admin');
$iniciais = strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', $usuario), 0, 2) ?: 'MK');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>VSOL Manager Pro</title>
  <style>
    /* Reset mínimo para o iframe */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; overflow: hidden; }
    iframe#vsol-app {
      width: 100%;
      height: calc(100vh - 52px); /* desconta a navbar do MK-Auth */
      border: none;
      display: block;
    }
  </style>
</head>
<body>
  <!-- O iframe isola completamente o CSS do MK-Auth (Bulma) do nosso app React (Tailwind) -->
  <iframe id="vsol-app"
    src="/admin/addons/vsol-optimized/app.php?u=<?= urlencode($usuario) ?>&i=<?= urlencode($iniciais) ?>"
    title="VSOL Manager Pro">
  </iframe>
</body>
</html>
