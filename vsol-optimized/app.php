<?php
/**
 * VSOL Manager Pro - App React (carregado dentro do iframe)
 * Isolado do CSS do MK-Auth
 */
if (file_exists(dirname(__FILE__) . '/addons.class.php')) {
    include(dirname(__FILE__) . '/addons.class.php');
} elseif (file_exists('/opt/mk-auth/include/addons.inc.hhvm')) {
    include('/opt/mk-auth/include/addons.inc.hhvm');
} else {
    die('Erro: addons.class.php não encontrado.');
}

if (session_status() === PHP_SESSION_NONE) {
    session_name('mka');
    if (!isset($_SESSION)) session_start();
}

if (!isset($_SESSION['MKA_Logado'])) {
    http_response_code(403);
    exit('Acesso negado.');
}

$usuario = isset($_GET['u']) ? htmlspecialchars($_GET['u']) : 
    (isset($_SESSION['MKA_Usuario']) ? $_SESSION['MKA_Usuario'] : 'Admin');
$iniciais = isset($_GET['i']) ? htmlspecialchars($_GET['i']) :
    strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', $usuario), 0, 2) ?: 'MK');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>VSOL Manager Pro</title>
  <!-- SEM CSS do MK-Auth aqui — isolado no iframe -->
  <link rel="stylesheet" href="./assets/index.css" />
</head>
<body>
  <div id="root"></div>
  <script>
    window.VSOL_USER = <?= json_encode(['name' => $usuario, 'initials' => $iniciais]) ?>;
  </script>
  <script type="module" src="./assets/index.js"></script>
</body>
</html>
