<?php
/**
 * VSOL Manager Pro - API Backend
 * Padrão ONU ISP: include addons.class.php (symlink) + $_SESSION['MKA_Logado']
 */

// Symlink criado pelo instalador — igual ONU ISP
if (file_exists(dirname(__FILE__) . '/../addons.class.php')) {
    include(dirname(__FILE__) . '/../addons.class.php');
} elseif (file_exists('/opt/mk-auth/include/addons.inc.hhvm')) {
    include('/opt/mk-auth/include/addons.inc.hhvm');
} else {
    die(json_encode(['erro' => true, 'log' => 'addons.class.php não encontrado. Execute o instalador.']));
}

// Sessão
if (session_status() === PHP_SESSION_NONE) {
    session_name('mka');
    if (!isset($_SESSION)) session_start();
}

// Verifica login (chamada AJAX) — igual ONU ISP
if (!isset($_SESSION['MKA_Logado'])) {
    http_response_code(401);
    die(json_encode(['erro' => true, 'log' => 'acesso negado, entre novamente em sua conta mkauth!']));
}

header('Content-Type: application/json; charset=utf-8');

$action = $_REQUEST['action'] ?? '';

switch ($action) {
    case 'test_db':     action_test_db();     break;
    case 'list_onus':   action_list_onus();   break;
    case 'ping_host':   action_ping_host();   break;
    case 'save_config': action_save_config(); break;
    case 'backup':      action_backup();      break;
    default:
        http_response_code(400);
        echo json_encode(['error' => "Ação desconhecida: $action"]);
}

function action_test_db(): void {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $host = $body['mkAuthIp'] ?? (defined('CONHOSTNAME') ? CONHOSTNAME : '127.0.0.1');
    $user = $body['dbUser']   ?? (defined('CONUSERNAME') ? CONUSERNAME : 'root');
    $pass = $body['dbPass']   ?? (defined('CONPASSWRD')  ? CONPASSWRD  : 'vertrigo');
    $db   = $body['dbName']   ?? (defined('CONDATABASE') ? CONDATABASE : 'mkradius');

    mysqli_report(MYSQLI_REPORT_OFF);
    $conn = @new mysqli($host, $user, $pass, $db, 3306);
    if ($conn->connect_errno) {
        echo json_encode(['ok' => false, 'message' => 'Falha: ' . $conn->connect_error]);
        return;
    }
    $res  = $conn->query("SELECT VERSION() as v, DATABASE() as d");
    $row  = $res ? $res->fetch_assoc() : [];
    $conn->close();
    echo json_encode(['ok' => true, 'message' => "Conexão OK! MySQL {$row['v']} — Banco: {$row['d']}", 'version' => $row['v'] ?? '', 'dbname' => $row['d'] ?? '']);
}

function action_list_onus(): void {
    if (!defined('CONHOSTNAME')) {
        echo json_encode(['ok' => false, 'onus' => [], 'total' => 0, 'message' => 'addons.class.php não carregado. Execute o instalador.']);
        return;
    }
    $mysqli = new mysqli(CONHOSTNAME, CONUSERNAME, CONPASSWRD, CONDATABASE);
    if ($mysqli->connect_errno) {
        echo json_encode(['ok' => false, 'onus' => [], 'total' => 0, 'message' => 'Erro DB: ' . $mysqli->connect_error]);
        return;
    }
    $onus = [];
    $res = $mysqli->query("SHOW TABLES LIKE 'onuisp_onus'");
    if ($res && $res->num_rows > 0) {
        $r = $mysqli->query("SELECT * FROM `onuisp_onus` ORDER BY rx DESC LIMIT 5000");
        if ($r) while ($row = $r->fetch_assoc()) {
            $onus[] = [
                'id'           => $row['id'],
                'serialNumber' => $row['sn'] ?? '',
                'name'         => $row['descricao'] ?? '',
                'oltId'        => $row['id_olts'] ?? '',
                'ponPort'      => (int)($row['id_pons'] ?? 0),
                'signalRx'     => (float)($row['rx'] ?? 0),
                'signalTx'     => (float)($row['tx'] ?? 0),
                'status'       => $row['status_onu'] ?? 'offline',
                'ip'           => $row['ip'] ?? '',
                'updatedAt'    => $row['updated_at'] ?? '',
            ];
        }
    }
    echo json_encode(['ok' => true, 'onus' => $onus, 'total' => count($onus)]);
}

function action_ping_host(): void {
    $ip = $_GET['ip'] ?? '';
    if (!filter_var($ip, FILTER_VALIDATE_IP)) { echo json_encode(['ok' => false, 'message' => 'IP inválido.']); return; }
    $out = shell_exec("ping -c 3 -W 2 " . escapeshellarg($ip) . " 2>&1");
    $ok  = strpos($out ?? '', '0% packet loss') !== false;
    preg_match('/rtt[^=]+=\s*([\d.]+)\/([\d.]+)/', $out ?? '', $m);
    $lat = isset($m[2]) ? $m[2] . ' ms' : 'N/A';
    echo json_encode(['ok' => $ok, 'message' => $ok ? "Host $ip acessível. Latência: $lat" : "Host $ip não respondeu.", 'latency' => $lat]);
}

function action_save_config(): void {
    $body    = json_decode(file_get_contents('php://input'), true) ?? [];
    $file    = __DIR__ . '/../vsol_config.json';
    $existing = file_exists($file) ? (json_decode(file_get_contents($file), true) ?? []) : [];
    file_put_contents($file, json_encode(array_merge($existing, $body), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    echo json_encode(['ok' => true, 'message' => 'Configurações salvas.']);
}

function action_backup(): void {
    $file   = __DIR__ . '/../vsol_config.json';
    $config = file_exists($file) ? (json_decode(file_get_contents($file), true) ?? []) : [];
    $ts     = date('Y-m-d_H-i-s');
    header('Content-Type: application/json');
    header('Content-Disposition: attachment; filename="vsol-backup-' . $ts . '.json"');
    header('Cache-Control: no-cache');
    echo json_encode(['version' => '2.0', 'generated' => date('c'), 'config' => $config], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}
