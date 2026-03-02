<?php
/**
 * VSOL Manager Pro - API Backend
 * Padrão ONU ISP: addons.class.php + $_SESSION['MKA_Logado']
 */

// ob_start evita que addons.inc.hhvm envie HTML de redirect
ob_start();
if (file_exists(dirname(__FILE__) . '/../addons.class.php')) {
    include(dirname(__FILE__) . '/../addons.class.php');
} elseif (file_exists('/opt/mk-auth/include/addons.inc.hhvm')) {
    include('/opt/mk-auth/include/addons.inc.hhvm');
}
ob_end_clean();

if (session_status() === PHP_SESSION_NONE) {
    session_name('mka');
    session_start();
}

if (!isset($_SESSION['MKA_Logado'])) {
    http_response_code(401);
    header('Content-Type: application/json');
    die(json_encode(['erro' => true, 'log' => 'acesso negado']));
}

header('Content-Type: application/json; charset=utf-8');

$action = $_REQUEST['action'] ?? '';

switch ($action) {
    case 'test_db':       action_test_db();       break;
    case 'list_onus':     action_list_onus();     break;
    case 'ping_host':     action_ping_host();     break;
    case 'save_config':   action_save_config();   break;
    case 'backup':        action_backup();        break;
    case 'test_telegram': action_test_telegram(); break;
    case 'send_telegram': action_send_telegram(); break;
    case 'geocode':       action_geocode();       break;
    default:
        http_response_code(400);
        echo json_encode(['error' => "Ação desconhecida: $action"]);
}

// ── Banco de Dados ────────────────────────────────────────────────────────────

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
    $res = $conn->query("SELECT VERSION() as v, DATABASE() as d");
    $row = $res ? $res->fetch_assoc() : [];
    $conn->close();
    echo json_encode(['ok' => true, 'message' => "Conexão OK! MySQL {$row['v']} — Banco: {$row['d']}"]);
}

// ── ONUs ──────────────────────────────────────────────────────────────────────

function action_list_onus(): void {
    if (!defined('CONHOSTNAME')) {
        echo json_encode(['ok' => false, 'onus' => [], 'total' => 0, 'message' => 'Constantes não carregadas.']);
        return;
    }
    $mysqli = new mysqli(CONHOSTNAME, CONUSERNAME, CONPASSWRD, CONDATABASE);
    if ($mysqli->connect_errno) {
        echo json_encode(['ok' => false, 'onus' => [], 'total' => 0, 'message' => $mysqli->connect_error]);
        return;
    }
    $onus = [];
    $res  = $mysqli->query("SHOW TABLES LIKE 'onuisp_onus'");
    if ($res && $res->num_rows > 0) {
        $r = $mysqli->query("SELECT * FROM `onuisp_onus` ORDER BY rx DESC LIMIT 5000");
        if ($r) while ($row = $r->fetch_assoc()) {
            $onus[] = [
                'id'           => $row['id'],
                'serialNumber' => $row['sn']          ?? '',
                'name'         => $row['descricao']   ?? '',
                'oltId'        => $row['id_olts']     ?? '',
                'ponPort'      => (int)($row['id_pons']   ?? 0),
                'signalRx'     => (float)($row['rx']  ?? 0),
                'signalTx'     => (float)($row['tx']  ?? 0),
                'status'       => $row['status_onu']  ?? 'offline',
                'ip'           => $row['ip']          ?? '',
                'updatedAt'    => $row['updated_at']  ?? '',
            ];
        }
    }
    echo json_encode(['ok' => true, 'onus' => $onus, 'total' => count($onus)]);
}

// ── Ping ──────────────────────────────────────────────────────────────────────

function action_ping_host(): void {
    $ip = $_GET['ip'] ?? '';
    if (!filter_var($ip, FILTER_VALIDATE_IP)) {
        echo json_encode(['ok' => false, 'message' => 'IP inválido.']);
        return;
    }
    $out = shell_exec("ping -c 3 -W 2 " . escapeshellarg($ip) . " 2>&1");
    $ok  = strpos($out ?? '', '0% packet loss') !== false;
    preg_match('/rtt[^=]+=\s*([\d.]+)\/([\d.]+)/', $out ?? '', $m);
    $lat = isset($m[2]) ? $m[2] . ' ms' : 'N/A';
    echo json_encode(['ok' => $ok, 'message' => $ok ? "Host $ip acessível. Latência: $lat" : "Host $ip não respondeu.", 'latency' => $lat]);
}

// ── Config / Backup ───────────────────────────────────────────────────────────

function action_save_config(): void {
    $body     = json_decode(file_get_contents('php://input'), true) ?? [];
    $file     = __DIR__ . '/../vsol_config.json';
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

// ── Telegram ──────────────────────────────────────────────────────────────────

function telegram_send(string $token, string $chatId, string $text): array {
    $url  = "https://api.telegram.org/bot{$token}/sendMessage";
    $data = json_encode(['chat_id' => $chatId, 'text' => $text, 'parse_mode' => 'HTML']);
    $ch   = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $data,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $res   = curl_exec($ch);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) return ['ok' => false, 'message' => "Erro cURL: $error"];
    $json = json_decode($res, true);
    return [
        'ok'      => $json['ok'] ?? false,
        'message' => $json['ok'] ? 'Mensagem enviada com sucesso!' : ($json['description'] ?? 'Erro desconhecido'),
    ];
}

function action_test_telegram(): void {
    $body   = json_decode(file_get_contents('php://input'), true) ?? [];
    $token  = trim($body['token']  ?? '');
    $chatId = trim($body['chatId'] ?? '');

    if (!$token || !$chatId) {
        echo json_encode(['ok' => false, 'message' => 'Token e Chat ID são obrigatórios.']);
        return;
    }

    $text = "✅ <b>VSOL Manager Pro</b>\n"
          . "━━━━━━━━━━━━━━━━\n"
          . "🤖 Bot configurado com sucesso!\n"
          . "🕐 " . date('d/m/Y H:i:s') . "\n"
          . "━━━━━━━━━━━━━━━━\n"
          . "Você receberá alertas de sua rede GPON/EPON aqui.";

    echo json_encode(telegram_send($token, $chatId, $text));
}

function action_send_telegram(): void {
    $body   = json_decode(file_get_contents('php://input'), true) ?? [];
    $token  = trim($body['token']  ?? '');
    $chatId = trim($body['chatId'] ?? '');
    $type   = $body['type']  ?? '';
    $data   = $body['data']  ?? [];

    if (!$token || !$chatId) {
        echo json_encode(['ok' => false, 'message' => 'Token e Chat ID não configurados.']);
        return;
    }

    $ts   = $data['timestamp']    ?? date('d/m/Y H:i:s');
    $olts = $data['olts_total']   ?? 0;
    $on   = $data['olts_online']  ?? 0;
    $off  = $data['olts_offline'] ?? 0;
    $onus = $data['onus_total']   ?? 0;
    $onu_on = $data['onus_online'] ?? 0;
    $uptime = $onus > 0 ? round(($onu_on / $onus) * 100, 1) : 0;
    $lista  = implode("\n", array_map(function($x) { return "  • " . $x; }, isset($data['offline_list']) ? $data['offline_list'] : []));

    switch ($type) {
        case 'onu_offline':
            $text = "🔴 <b>ALERTA: ONU/OLT OFFLINE</b>\n"
                  . "━━━━━━━━━━━━━━━━\n"
                  . "📡 OLTs offline: <b>{$off}</b>\n"
                  . ($lista ? "📋 Lista:\n{$lista}\n" : "")
                  . "🕐 {$ts}";
            break;
        case 'sinal_critico':
            $text = "⚠️ <b>ALERTA: SINAL CRÍTICO</b>\n"
                  . "━━━━━━━━━━━━━━━━\n"
                  . "📶 ONUs com sinal abaixo do limite detectadas\n"
                  . "📡 Total de ONUs: <b>{$onus}</b>\n"
                  . "✅ Online: <b>{$onu_on}</b>\n"
                  . "🕐 {$ts}";
            break;
        case 'olt_offline':
            $text = "🚨 <b>ALERTA CRÍTICO: OLT OFFLINE</b>\n"
                  . "━━━━━━━━━━━━━━━━\n"
                  . "📡 OLTs sem resposta: <b>{$off}</b> de {$olts}\n"
                  . ($lista ? "📋 Equipamentos:\n{$lista}\n" : "")
                  . "🕐 {$ts}";
            break;
        case 'resumo':
        default:
            $status = $off === 0 ? '🟢 Rede estável' : '🔴 Atenção necessária';
            $text = "📊 <b>RESUMO DIÁRIO — VSOL Manager</b>\n"
                  . "━━━━━━━━━━━━━━━━\n"
                  . "{$status}\n\n"
                  . "📡 <b>OLTs:</b> {$on}/{$olts} online\n"
                  . "📶 <b>ONUs:</b> {$onu_on}/{$onus} online\n"
                  . "⏱️ <b>Uptime:</b> {$uptime}%\n"
                  . ($off > 0 ? "⚠️ <b>Offline:</b>\n{$lista}\n" : "")
                  . "━━━━━━━━━━━━━━━━\n"
                  . "🕐 {$ts}";
    }

    echo json_encode(telegram_send($token, $chatId, $text));
}

// ── Google Maps Geocode ───────────────────────────────────────────────────────

function action_geocode(): void {
    $body    = json_decode(file_get_contents('php://input'), true) ?? [];
    $address = trim($body['address'] ?? '');
    $apiKey  = trim($body['apiKey']  ?? '');

    if (!$address || !$apiKey) {
        echo json_encode(['ok' => false, 'message' => 'Endereço e API Key são obrigatórios.']);
        return;
    }

    $url = 'https://maps.googleapis.com/maps/api/geocode/json?address='
         . urlencode($address) . '&key=' . urlencode($apiKey) . '&language=pt-BR';

    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_SSL_VERIFYPEER => false]);
    $res   = curl_exec($ch);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) { echo json_encode(['ok' => false, 'message' => "Erro cURL: $error"]); return; }

    $json = json_decode($res, true);
    if (($json['status'] ?? '') !== 'OK' || empty($json['results'])) {
        echo json_encode(['ok' => false, 'message' => 'Endereço não encontrado: ' . ($json['status'] ?? 'ERRO')]);
        return;
    }

    $loc = $json['results'][0]['geometry']['location'];
    echo json_encode([
        'ok'        => true,
        'lat'       => $loc['lat'],
        'lng'       => $loc['lng'],
        'formatted' => $json['results'][0]['formatted_address'],
        'message'   => 'Endereço encontrado.',
    ]);
}


function action_maps_olts(): void {
    if (!defined('CONHOSTNAME')) {
        echo json_encode(['ok' => false, 'items' => [], 'mapsKey' => '']);
        return;
    }
    $mysqli = new mysqli(CONHOSTNAME, CONUSERNAME, CONPASSWRD, CONDATABASE);
    if ($mysqli->connect_errno) {
        echo json_encode(['ok' => false, 'items' => [], 'mapsKey' => '', 'message' => $mysqli->connect_error]);
        return;
    }

    $items   = [];
    $mapsKey = '';

    // Busca API Key do Maps na config
    $r = $mysqli->query("SELECT key_google_maps FROM vsol_config LIMIT 1");
    if ($r && $row = $r->fetch_assoc()) {
        $mapsKey = $row['key_google_maps'] ?? '';
    }

    // Busca OLTs cadastradas
    $r = $mysqli->query("SELECT * FROM vsol_olts WHERE ativo = 1");
    if ($r) while ($row = $r->fetch_assoc()) {
        $items[] = [
            'type'   => 'olt',
            'id'     => 'olt_' . $row['id'],
            'name'   => $row['nome'],
            'ip'     => $row['ip'],
            'model'  => $row['modelo'],
            'status' => 'online',
            'lat'    => null,
            'lng'    => null,
        ];
    }

    // Busca clientes do MK-Auth com endereço (se tabela existir)
    $r = $mysqli->query("SHOW TABLES LIKE 'clientes'");
    if ($r && $r->num_rows > 0) {
        $r2 = $mysqli->query("SELECT login, nome, endereco, bairro, cidade FROM clientes WHERE endereco != '' LIMIT 200");
        if ($r2) while ($row = $r2->fetch_assoc()) {
            $items[] = [
                'type'    => 'client',
                'id'      => 'cli_' . $row['login'],
                'name'    => $row['nome'] ?: $row['login'],
                'address' => trim($row['endereco'] . ', ' . $row['bairro'] . ', ' . $row['cidade']),
                'lat'     => null,
                'lng'     => null,
            ];
        }
    }

    $mysqli->close();
    echo json_encode(['ok' => true, 'items' => $items, 'mapsKey' => $mapsKey]);
}
