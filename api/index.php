<?php
/**
 * VSOL Manager Pro - API Backend
 * Endpoints PHP que o frontend React chama via fetch().
 * Todos os endpoints exigem sessão válida do MK-Auth.
 */

session_start();
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

// ── Proteção de acesso ────────────────────────────────────────────────────────
if (!isset($_SESSION['admin_login']) || empty($_SESSION['admin_login'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Não autorizado. Faça login no MK-Auth.']);
    exit;
}

// ── Roteamento ────────────────────────────────────────────────────────────────
$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {
    case 'test_db':       action_test_db();       break;
    case 'list_onus':     action_list_onus();     break;
    case 'backup':        action_backup();        break;
    case 'ping_host':     action_ping_host();     break;
    default:
        http_response_code(400);
        echo json_encode(['error' => "Ação desconhecida: $action"]);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function get_config(): array {
    $config_file = __DIR__ . '/../vsol_config.json';
    if (file_exists($config_file)) {
        $data = json_decode(file_get_contents($config_file), true);
        return $data ?? [];
    }
    return [];
}

function db_connect(array $cfg): mysqli|false {
    $host = $cfg['mkAuthIp'] ?? '172.31.255.2';
    $user = $cfg['dbUser']   ?? 'root';
    $pass = $cfg['dbPass']   ?? 'vertrigo';
    $db   = $cfg['dbName']   ?? 'mk_auth';

    mysqli_report(MYSQLI_REPORT_OFF);
    $conn = @new mysqli($host, $user, $pass, $db, 3306);
    if ($conn->connect_errno) {
        return false;
    }
    $conn->set_charset('utf8');
    return $conn;
}

// ── Actions ───────────────────────────────────────────────────────────────────

/**
 * POST action=test_db
 * Testa conexão com o banco de dados MySQL do MK-Auth.
 */
function action_test_db(): void {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $cfg  = get_config();

    $host = $body['mkAuthIp'] ?? $cfg['mkAuthIp'] ?? '172.31.255.2';
    $user = $body['dbUser']   ?? $cfg['dbUser']   ?? 'root';
    $pass = $body['dbPass']   ?? $cfg['dbPass']   ?? 'vertrigo';
    $db   = $body['dbName']   ?? $cfg['dbName']   ?? 'mk_auth';

    mysqli_report(MYSQLI_REPORT_OFF);
    $conn = @new mysqli($host, $user, $pass, $db, 3306);

    if ($conn->connect_errno) {
        echo json_encode([
            'ok'      => false,
            'message' => 'Falha na conexão: ' . $conn->connect_error,
            'errno'   => $conn->connect_errno,
        ]);
        return;
    }

    // Tenta ler versão do MySQL para confirmar acesso real
    $result  = $conn->query("SELECT VERSION() as v, DATABASE() as d");
    $row     = $result ? $result->fetch_assoc() : null;
    $version = $row['v'] ?? 'N/A';
    $dbname  = $row['d'] ?? $db;
    $conn->close();

    echo json_encode([
        'ok'      => true,
        'message' => "Conexão bem-sucedida! MySQL $version — Banco: $dbname",
        'version' => $version,
        'dbname'  => $dbname,
    ]);
}

/**
 * GET action=list_onus
 * Lista todas as ONUs registradas no banco do MK-Auth (tabela onus ou similar).
 * Adapte a query conforme o schema real do MK-Auth / ONU ISP addon.
 */
function action_list_onus(): void {
    $cfg  = get_config();
    $conn = db_connect($cfg);

    if (!$conn) {
        // Sem conexão: retorna lista vazia com aviso
        echo json_encode([
            'ok'      => false,
            'message' => 'Banco não configurado ou inacessível. Configure em Configurações → Banco de Dados.',
            'onus'    => [],
        ]);
        return;
    }

    // Verifica quais tabelas existem (compatibilidade com diferentes versões)
    $tables = [];
    $res = $conn->query("SHOW TABLES");
    while ($row = $res->fetch_row()) $tables[] = $row[0];

    $onus = [];

    // ONU ISP addon usa tabela 'onus' com colunas específicas
    if (in_array('onus', $tables)) {
        $sql = "SELECT
                    o.id,
                    o.sn        AS serialNumber,
                    o.descricao AS name,
                    o.olt_id    AS oltId,
                    o.pon       AS ponPort,
                    o.rx        AS signalRx,
                    o.tx        AS signalTx,
                    o.status,
                    o.ip,
                    o.vlan,
                    o.marca     AS brand,
                    o.modelo    AS model,
                    o.updated_at
                FROM onus o
                ORDER BY o.status ASC, o.rx DESC
                LIMIT 2000";
        $res = $conn->query($sql);
        if ($res) {
            while ($row = $res->fetch_assoc()) {
                $onus[] = [
                    'id'           => $row['id'],
                    'serialNumber' => $row['serialNumber'] ?? '',
                    'name'         => $row['name'] ?? '',
                    'oltId'        => $row['oltId'] ?? '',
                    'ponPort'      => (int)($row['ponPort'] ?? 0),
                    'signalRx'     => (float)($row['signalRx'] ?? 0),
                    'signalTx'     => (float)($row['signalTx'] ?? 0),
                    'status'       => $row['status'] ?? 'offline',
                    'ip'           => $row['ip'] ?? '',
                    'vlan'         => (int)($row['vlan'] ?? 0),
                    'brand'        => $row['brand'] ?? '',
                    'model'        => $row['model'] ?? '',
                    'updatedAt'    => $row['updated_at'] ?? '',
                ];
            }
        }
    } elseif (in_array('onu', $tables)) {
        // Fallback: tabela alternativa
        $sql = "SELECT * FROM onu ORDER BY id DESC LIMIT 2000";
        $res = $conn->query($sql);
        if ($res) {
            while ($row = $res->fetch_assoc()) {
                $onus[] = $row;
            }
        }
    }

    $conn->close();
    echo json_encode([
        'ok'     => true,
        'onus'   => $onus,
        'total'  => count($onus),
        'tables' => $tables, // para debug
    ]);
}

/**
 * GET action=ping_host&ip=X.X.X.X
 * Faz ping no servidor para testar conectividade com a OLT.
 */
function action_ping_host(): void {
    $ip = $_GET['ip'] ?? '';

    // Valida IP
    if (!filter_var($ip, FILTER_VALIDATE_IP)) {
        echo json_encode(['ok' => false, 'message' => 'IP inválido.']);
        return;
    }

    // Executa ping com timeout de 2 segundos, 3 pacotes
    $cmd    = "ping -c 3 -W 2 " . escapeshellarg($ip) . " 2>&1";
    $output = shell_exec($cmd);

    $ok = strpos($output ?? '', '0% packet loss') !== false ||
          strpos($output ?? '', '0 received') === false && strpos($output ?? '', 'bytes from') !== false;

    // Extrai latência média
    preg_match('/rtt[^=]+=\s*([\d.]+)\/([\d.]+)\/([\d.]+)/', $output ?? '', $m);
    $latency = isset($m[2]) ? $m[2] . ' ms' : 'N/A';

    echo json_encode([
        'ok'      => $ok,
        'message' => $ok ? "Host $ip acessível. Latência: $latency" : "Host $ip não respondeu ao ping.",
        'latency' => $latency,
        'raw'     => $output,
    ]);
}

/**
 * GET action=backup
 * Gera um arquivo ZIP com todos os dados do addon (configs + storage) para download.
 */
function action_backup(): void {
    $timestamp  = date('Y-m-d_H-i-s');
    $filename   = "vsol-backup-$timestamp.json";

    $backup = [
        'version'    => '2.0',
        'generated'  => date('c'),
        'generated_by' => $_SESSION['admin_login'] ?? 'unknown',
        'config'     => get_config(),
        'note'       => 'Backup gerado pelo VSOL Manager Pro. Importe nas configurações para restaurar.',
    ];

    header('Content-Type: application/json');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Cache-Control: no-cache');
    echo json_encode($backup, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}
