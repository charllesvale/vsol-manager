<?php
/**
 * VSOL Manager Pro - API Backend
 * Padrao ONU ISP: addons.class.php + $_SESSION['MKA_Logado']
 */

ob_start();
if (file_exists(dirname(__FILE__) . '/../addons.class.php')) {
    include(dirname(__FILE__) . '/../addons.class.php');
} elseif (file_exists('/opt/mk-auth/include/addons.inc.hhvm')) {
    include('/opt/mk-auth/include/addons.inc.hhvm');
}
ob_end_clean();

$vsol_autoload = __DIR__ . '/../vendor/autoload.php';
if (file_exists($vsol_autoload)) require_once $vsol_autoload;

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

// telegram_proxy: endpoint publico
if (($_REQUEST['action'] ?? '') === 'telegram_proxy') {
    $body   = json_decode(file_get_contents('php://input'), true) ?? [];
    $token  = trim($body['token']  ?? '');
    $chatId = trim($body['chatId'] ?? '');
    $text   = trim($body['text']   ?? '');
    if (!$token || !$chatId || !$text) die(json_encode(['ok'=>false,'message'=>'Parametros invalidos.']));
    $url  = "https://api.telegram.org/bot{$token}/sendMessage";
    $data = json_encode(['chat_id'=>$chatId,'text'=>$text,'parse_mode'=>'HTML']);
    $ch   = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_POST=>true, CURLOPT_POSTFIELDS=>$data, CURLOPT_HTTPHEADER=>['Content-Type: application/json'], CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>10, CURLOPT_SSL_VERIFYPEER=>false]);
    $res = curl_exec($ch); $erro = curl_error($ch); curl_close($ch);
    if ($erro) die(json_encode(['ok'=>false,'message'=>"Erro cURL: $erro"]));
    $json = json_decode($res, true);
    die(json_encode(['ok'=>$json['ok']??false,'message'=>($json['ok']??false)?'Mensagem enviada!':($json['description']??'Erro')]));
}

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
    case 'maps_olts':     action_maps_olts();     break;
    case 'list_olts':     action_list_olts();     break;
    case 'add_olt':       action_add_olt();       break;
    case 'update_olt':    action_update_olt();    break;
    case 'delete_olt':    action_delete_olt();    break;
    case 'query_olt':     action_query_olt();     break;
    case 'list_ctos':        action_list_ctos();        break;
    case 'add_cto':          action_add_cto();          break;
    case 'update_cto':       action_update_cto();       break;
    case 'delete_cto':       action_delete_cto();       break;
    case 'import_kml':       action_import_kml();       break;
    case 'list_cto_clients': action_list_cto_clients(); break;
    case 'assign_client':    action_assign_client();    break;
    case 'remove_client':    action_remove_client();    break;
    case 'ai_analise':       action_ai_analise();       break;
    case 'maps_full':        action_maps_full();        break;
    default:
        http_response_code(400);
        echo json_encode(['error' => "Acao desconhecida: {$action}"]);
}

// ── Banco de Dados ────────────────────────────────────────────────────────────

function action_test_db() {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $host = $body['mkAuthIp'] ?? (defined('CONHOSTNAME') ? CONHOSTNAME : '127.0.0.1');
    $user = $body['dbUser']   ?? (defined('CONUSERNAME') ? CONUSERNAME : 'root');
    $pass = $body['dbPass']   ?? (defined('CONPASSWRD')  ? CONPASSWRD  : 'vertrigo');
    $db   = $body['dbName']   ?? (defined('CONDATABASE') ? CONDATABASE : 'mkradius');
    mysqli_report(MYSQLI_REPORT_OFF);
    $conn = @new mysqli($host, $user, $pass, $db, 3306);
    if ($conn->connect_errno) {
        echo json_encode(['ok'=>false,'message'=>'Falha: '.$conn->connect_error]); return;
    }
    $res = $conn->query("SELECT VERSION() as v, DATABASE() as d");
    $row = $res ? $res->fetch_assoc() : [];
    $conn->close();
    echo json_encode(['ok'=>true,'message'=>"Conexao OK! MySQL {$row['v']} - Banco: {$row['d']}"]);
}

// ── Ping ──────────────────────────────────────────────────────────────────────

function action_ping_host() {
    $ip = $_GET['ip'] ?? '';
    if (!filter_var($ip, FILTER_VALIDATE_IP)) {
        echo json_encode(['ok'=>false,'message'=>'IP invalido.']); return;
    }
    $out = shell_exec("ping -c 3 -W 2 " . escapeshellarg($ip) . " 2>&1");
    $ok  = strpos($out ?? '', '0% packet loss') !== false;
    preg_match('/rtt[^=]+=\s*([\d.]+)\/([\d.]+)/', $out ?? '', $m);
    $lat = isset($m[2]) ? $m[2].' ms' : 'N/A';
    echo json_encode(['ok'=>$ok,'message'=>$ok?"Host $ip acessivel. Latencia: $lat":"Host $ip nao respondeu.",'latency'=>$lat]);
}

// ── Config / Backup ───────────────────────────────────────────────────────────

function action_save_config() {
    $body     = json_decode(file_get_contents('php://input'), true) ?? [];
    $file     = __DIR__ . '/../vsol_config.json';
    $existing = file_exists($file) ? (json_decode(file_get_contents($file), true) ?? []) : [];
    file_put_contents($file, json_encode(array_merge($existing, $body), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    echo json_encode(['ok'=>true,'message'=>'Configuracoes salvas.']);
}

function action_backup() {
    $file   = __DIR__ . '/../vsol_config.json';
    $config = file_exists($file) ? (json_decode(file_get_contents($file), true) ?? []) : [];
    $ts     = date('Y-m-d_H-i-s');
    header('Content-Type: application/json');
    header('Content-Disposition: attachment; filename="vsol-backup-'.$ts.'.json"');
    header('Cache-Control: no-cache');
    echo json_encode(['version'=>'2.0','generated'=>date('c'),'config'=>$config], JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE);
    exit;
}

// ── Telegram ──────────────────────────────────────────────────────────────────

function telegram_send($token, $chatId, $text) {
    $url  = "https://api.telegram.org/bot{$token}/sendMessage";
    $data = json_encode(['chat_id'=>$chatId,'text'=>$text,'parse_mode'=>'HTML']);
    $ch   = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_POST=>true, CURLOPT_POSTFIELDS=>$data, CURLOPT_HTTPHEADER=>['Content-Type: application/json'], CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>10, CURLOPT_SSL_VERIFYPEER=>false]);
    $res  = curl_exec($ch); $error = curl_error($ch); curl_close($ch);
    if ($error) return ['ok'=>false,'message'=>"Erro cURL: $error"];
    $json = json_decode($res, true);
    return ['ok'=>$json['ok']??false,'message'=>($json['ok']??false)?'Mensagem enviada com sucesso!':($json['description']??'Erro desconhecido')];
}

function action_test_telegram() {
    $body   = json_decode(file_get_contents('php://input'), true) ?? [];
    $token  = trim($body['token']  ?? '');
    $chatId = trim($body['chatId'] ?? '');
    if (!$token || !$chatId) { echo json_encode(['ok'=>false,'message'=>'Token e Chat ID sao obrigatorios.']); return; }
    $text = "Bot VSOL Manager Pro configurado com sucesso!\n".date('d/m/Y H:i:s')."\nVoce recebera alertas da rede GPON/EPON aqui.";
    echo json_encode(telegram_send($token, $chatId, $text));
}

function action_send_telegram() {
    $body   = json_decode(file_get_contents('php://input'), true) ?? [];
    $token  = trim($body['token']  ?? '');
    $chatId = trim($body['chatId'] ?? '');
    $type   = $body['type'] ?? '';
    $data   = $body['data'] ?? [];
    if (!$token || !$chatId) { echo json_encode(['ok'=>false,'message'=>'Token e Chat ID nao configurados.']); return; }
    $ts     = $data['timestamp']    ?? date('d/m/Y H:i:s');
    $olts   = $data['olts_total']   ?? 0;
    $on     = $data['olts_online']  ?? 0;
    $off    = $data['olts_offline'] ?? 0;
    $onus   = $data['onus_total']   ?? 0;
    $onu_on = $data['onus_online']  ?? 0;
    $uptime = $onus > 0 ? round(($onu_on/$onus)*100,1) : 0;
    $lista  = implode("\n", array_map(function($x){ return "  - ".$x; }, $data['offline_list'] ?? []));
    switch ($type) {
        case 'onu_offline':
            $text = "ALERTA: OLT OFFLINE\nOLTs offline: {$off}\n".($lista?"Lista:\n{$lista}\n":"")."{$ts}"; break;
        case 'sinal_critico':
            $text = "ALERTA: SINAL CRITICO\nONUs com sinal baixo\nTotal: {$onus}\nOnline: {$onu_on}\n{$ts}"; break;
        default:
            $status = $off===0?"Rede estavel":"Atencao necessaria";
            $text = "RESUMO DIARIO - VSOL Manager\n{$status}\nOLTs: {$on}/{$olts} online\nONUs: {$onu_on}/{$onus} online\nUptime: {$uptime}%\n{$ts}";
    }
    echo json_encode(telegram_send($token, $chatId, $text));
}

// ── Google Maps Geocode ───────────────────────────────────────────────────────

function action_geocode() {
    $body    = json_decode(file_get_contents('php://input'), true) ?? [];
    $address = trim($body['address'] ?? '');
    $apiKey  = trim($body['apiKey']  ?? '');
    if (!$apiKey && defined('CONHOSTNAME')) {
        $m = new mysqli(CONHOSTNAME, CONUSERNAME, CONPASSWRD, CONDATABASE);
        if (!$m->connect_errno) {
            $r = $m->query("SELECT key_google_maps FROM vsol_config LIMIT 1");
            if ($r && $row=$r->fetch_assoc()) $apiKey = $row['key_google_maps'] ?? '';
            $m->close();
        }
    }
    if (!$address || !$apiKey) { echo json_encode(['ok'=>false,'message'=>'Endereco e API Key sao obrigatorios.']); return; }
    $url = 'https://maps.googleapis.com/maps/api/geocode/json?address='.urlencode($address).'&key='.urlencode($apiKey).'&language=pt-BR';
    $ch  = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>10, CURLOPT_SSL_VERIFYPEER=>false]);
    $res = curl_exec($ch); $error = curl_error($ch); curl_close($ch);
    if ($error) { echo json_encode(['ok'=>false,'message'=>"Erro cURL: $error"]); return; }
    $json = json_decode($res, true);
    if (($json['status']??'') !== 'OK' || empty($json['results'])) {
        echo json_encode(['ok'=>false,'message'=>'Endereco nao encontrado: '.($json['status']??'ERRO')]); return;
    }
    $loc = $json['results'][0]['geometry']['location'];
    echo json_encode(['ok'=>true,'lat'=>$loc['lat'],'lng'=>$loc['lng'],'formatted'=>$json['results'][0]['formatted_address'],'message'=>'Endereco encontrado.']);
}


function action_list_onus() {
    if (!defined('CONHOSTNAME')) {
        echo json_encode(['ok'=>false,'onus'=>[],'total'=>0,'message'=>'Constantes nao carregadas.']); return;
    }
    $mysqli = new mysqli(CONHOSTNAME, CONUSERNAME, CONPASSWRD, CONDATABASE);
    if ($mysqli->connect_errno) {
        echo json_encode(['ok'=>false,'onus'=>[],'total'=>0,'message'=>$mysqli->connect_error]); return;
    }
    $onus = [];
    $res = $mysqli->query("SHOW TABLES LIKE 'vsol_onus'");
    if ($res && $res->num_rows > 0) {
        $r = $mysqli->query("SELECT v.*, o.nome as olt_nome FROM vsol_onus v LEFT JOIN vsol_olts o ON o.id=v.id_olt ORDER BY v.rx DESC LIMIT 5000");
        if ($r) while ($row = $r->fetch_assoc()) {
            $onus[] = [
                'id'           => (string)$row['id'],
                'serialNumber' => isset($row['sn'])         ? $row['sn']         : '',
                'name'         => isset($row['descricao'])  ? $row['descricao']  : '',
                'oltId'        => (string)(isset($row['id_olt']) ? $row['id_olt'] : ''),
                'ponPort'      => (int)(isset($row['id_pon'])    ? $row['id_pon']    : 0),
                'signalRx'     => (float)(isset($row['rx'])      ? $row['rx']      : 0),
                'signalTx'     => (float)(isset($row['tx'])      ? $row['tx']      : 0),
                'status'       => isset($row['status_onu']) ? $row['status_onu'] : 'offline',
                'ip'           => isset($row['ip'])         ? $row['ip']         : '',
                'vlan'         => (int)(isset($row['vlan']) ? $row['vlan']       : 0),
                'updatedAt'    => isset($row['updated_at']) ? $row['updated_at'] : '',
            ];
        }
    }
    if (empty($onus)) {
        $res = $mysqli->query("SHOW TABLES LIKE 'onuisp_onus'");
        if ($res && $res->num_rows > 0) {
            $r = $mysqli->query("SELECT * FROM `onuisp_onus` ORDER BY rx DESC LIMIT 5000");
            if ($r) while ($row = $r->fetch_assoc()) {
                $onus[] = [
                    'id'           => (string)$row['id'],
                    'serialNumber' => isset($row['sn'])           ? $row['sn']           : '',
                    'name'         => isset($row['descricao'])    ? $row['descricao']    : '',
                    'oltId'        => (string)(isset($row['id_olts']) ? $row['id_olts'] : ''),
                    'ponPort'      => (int)(isset($row['id_pons'])    ? $row['id_pons']    : 0),
                    'signalRx'     => (float)(isset($row['rx'])   ? $row['rx']   : 0),
                    'signalTx'     => (float)(isset($row['tx'])   ? $row['tx']   : 0),
                    'status'       => isset($row['status_onu'])   ? $row['status_onu']   : 'offline',
                    'ip'           => isset($row['ip'])            ? $row['ip']            : '',
                    'vlan'         => 0,
                    'updatedAt'    => isset($row['updated_at'])   ? $row['updated_at']   : '',
                ];
            }
        }
    }
    $mysqli->close();
    echo json_encode(['ok'=>true,'onus'=>$onus,'total'=>count($onus)]);
}

function action_list_olts_isp() {
    if (!defined('CONHOSTNAME')) { echo json_encode(['ok'=>false,'olts'=>[]]); return; }
    $mysqli = new mysqli(CONHOSTNAME, CONUSERNAME, CONPASSWRD, CONDATABASE);
    if ($mysqli->connect_errno) { echo json_encode(['ok'=>false,'olts'=>[]]); return; }
    $olts = [];
    foreach (['onuisp_olts','vsol_olts'] as $t) {
        $res = $mysqli->query("SHOW TABLES LIKE '{$t}'");
        if ($res && $res->num_rows > 0) {
            $r = $mysqli->query("SELECT * FROM `{$t}` ORDER BY id");
            if ($r) while ($row=$r->fetch_assoc()) $olts[]=$row;
            if (!empty($olts)) break;
        }
    }
    $mysqli->close();
    echo json_encode(['ok'=>true,'olts'=>$olts]);
}

function action_list_pons() {
    if (!defined('CONHOSTNAME')) { echo json_encode(['ok'=>false,'pons'=>[]]); return; }
    $oltId = (int)(isset($_GET['olt_id']) ? $_GET['olt_id'] : 0);
    $mysqli = new mysqli(CONHOSTNAME, CONUSERNAME, CONPASSWRD, CONDATABASE);
    if ($mysqli->connect_errno) { echo json_encode(['ok'=>false,'pons'=>[]]); return; }
    $pons = [];
    foreach (['onuisp_pons','vsol_pons'] as $t) {
        $res = $mysqli->query("SHOW TABLES LIKE '{$t}'");
        if ($res && $res->num_rows > 0) {
            $where = $oltId ? "WHERE id_olts={$oltId}" : '';
            $r = $mysqli->query("SELECT * FROM `{$t}` {$where} ORDER BY id");
            if ($r) while ($row=$r->fetch_assoc()) $pons[]=$row;
            if (!empty($pons)) break;
        }
    }
    $mysqli->close();
    echo json_encode(['ok'=>true,'pons'=>$pons]);
}

function action_onu_details() {
    if (!defined('CONHOSTNAME')) { echo json_encode(['ok'=>false,'onu'=>null]); return; }
    $id = (int)(isset($_GET['id']) ? $_GET['id'] : 0);
    if (!$id) { echo json_encode(['ok'=>false,'onu'=>null,'message'=>'ID invalido.']); return; }
    $mysqli = new mysqli(CONHOSTNAME, CONUSERNAME, CONPASSWRD, CONDATABASE);
    if ($mysqli->connect_errno) { echo json_encode(['ok'=>false,'onu'=>null]); return; }
    $onu = null;
    foreach (['vsol_onus','onuisp_onus'] as $t) {
        $res = $mysqli->query("SHOW TABLES LIKE '{$t}'");
        if ($res && $res->num_rows > 0) {
            $r = $mysqli->query("SELECT * FROM `{$t}` WHERE id={$id}");
            if ($r && ($row=$r->fetch_assoc())) { $onu=$row; break; }
        }
    }
    $mysqli->close();
    echo json_encode($onu ? ['ok'=>true,'onu'=>$onu] : ['ok'=>false,'onu'=>null,'message'=>'ONU nao encontrada.']);
}

function action_update_onu() {
    if (!defined('CONHOSTNAME')) { echo json_encode(['ok'=>false,'message'=>'Sem constantes.']); return; }
    $b = json_decode(file_get_contents('php://input'), true);
    if (!$b) $b = [];
    $id = (int)(isset($b['id']) ? $b['id'] : 0);
    if (!$id) { echo json_encode(['ok'=>false,'message'=>'ID invalido.']); return; }
    $mysqli = new mysqli(CONHOSTNAME, CONUSERNAME, CONPASSWRD, CONDATABASE);
    if ($mysqli->connect_errno) { echo json_encode(['ok'=>false,'message'=>$mysqli->connect_error]); return; }
    $table = 'vsol_onus';
    $res = $mysqli->query("SHOW TABLES LIKE 'vsol_onus'");
    if (!$res || $res->num_rows === 0) $table = 'onuisp_onus';
    $desc = $mysqli->real_escape_string(isset($b['descricao']) ? $b['descricao'] : (isset($b['name']) ? $b['name'] : ''));
    $mysqli->query("UPDATE `{$table}` SET descricao='{$desc}' WHERE id={$id}");
    $mysqli->close();
    echo json_encode(['ok'=>true,'message'=>'ONU atualizada.']);
}

function action_maps_olts() {
    if (!defined('CONHOSTNAME')) { echo json_encode(['ok'=>false,'olts'=>[]]); return; }
    $mysqli = new mysqli(CONHOSTNAME, CONUSERNAME, CONPASSWRD, CONDATABASE);
    if ($mysqli->connect_errno) { echo json_encode(['ok'=>false,'olts'=>[]]); return; }
    $olts = [];
    $res = $mysqli->query("SHOW TABLES LIKE 'vsol_olts'");
    if ($res && $res->num_rows > 0) {
        $r = $mysqli->query("SELECT id,nome,ip,lat,lng,modelo FROM vsol_olts WHERE lat IS NOT NULL AND lng IS NOT NULL ORDER BY id");
        if ($r) while ($row=$r->fetch_assoc()) $olts[]=$row;
    }
    $mysqli->close();
    echo json_encode(['ok'=>true,'olts'=>$olts]);
}

// ── Helper DB ─────────────────────────────────────────────────────────────────

function vsol_get_db() {
    if (!defined('CONHOSTNAME')) return null;
    mysqli_report(MYSQLI_REPORT_OFF);
    $db = @new mysqli(CONHOSTNAME, CONUSERNAME, CONPASSWRD, CONDATABASE);
    return $db->connect_errno ? null : $db;
}

function vsol_ensure_olts_table($db) {
    $db->query("CREATE TABLE IF NOT EXISTS `vsol_olts` (
        `id`         int(11)      NOT NULL AUTO_INCREMENT,
        `nome`       varchar(100) NOT NULL DEFAULT '',
        `ip`         varchar(50)  NOT NULL DEFAULT '',
        `usuario`    varchar(50)  NOT NULL DEFAULT 'admin',
        `senha`      varchar(100) NOT NULL DEFAULT '',
        `porta_ssh`  int(11)      NOT NULL DEFAULT 22,
        `modelo`     varchar(50)  NOT NULL DEFAULT 'V1600G1',
        `ativo`      tinyint(1)   NOT NULL DEFAULT 1,
        `endereco`   varchar(200) DEFAULT '',
        `lat`        double       DEFAULT NULL,
        `lng`        double       DEFAULT NULL,
        `created_at` datetime     DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;");
}

// ── OLT CRUD ──────────────────────────────────────────────────────────────────

function action_list_olts() {
    $db = vsol_get_db();
    if (!$db) { echo json_encode(['ok'=>false,'olts'=>[],'message'=>'Banco nao disponivel.']); return; }
    vsol_ensure_olts_table($db);
    $r = $db->query("SELECT id,nome,ip,usuario,porta_ssh,modelo,ativo,endereco,lat,lng,created_at FROM vsol_olts ORDER BY id");
    $rows = [];
    if ($r) while ($row=$r->fetch_assoc()) {
        $row['id']       = (int)$row['id'];
        $row['porta_ssh']= (int)$row['porta_ssh'];
        $row['ativo']    = (int)$row['ativo'];
        $rows[] = $row;
    }
    $db->close();
    echo json_encode(['ok'=>true,'olts'=>$rows]);
}

function action_add_olt() {
    $db = vsol_get_db();
    if (!$db) { echo json_encode(['ok'=>false,'message'=>'Banco nao disponivel.']); return; }
    $b = json_decode(file_get_contents('php://input'), true);
    if (!$b) $b = [];
    $nome     = $db->real_escape_string(trim(isset($b['nome'])     ? $b['nome']     : ''));
    $ip       = $db->real_escape_string(trim(isset($b['ip'])       ? $b['ip']       : ''));
    $usuario  = $db->real_escape_string(trim(isset($b['usuario'])  ? $b['usuario']  : 'admin'));
    $senha    = $db->real_escape_string(trim(isset($b['senha'])    ? $b['senha']    : ''));
    $porta    = (int)(isset($b['porta_ssh']) ? $b['porta_ssh'] : 22);
    $modelo   = $db->real_escape_string(trim(isset($b['modelo'])   ? $b['modelo']   : 'V1600G1'));
    $endereco = $db->real_escape_string(trim(isset($b['endereco']) ? $b['endereco'] : ''));
    $latSql   = (isset($b['lat']) && $b['lat'] !== '' && $b['lat'] !== null) ? (float)$b['lat'] : 'NULL';
    $lngSql   = (isset($b['lng']) && $b['lng'] !== '' && $b['lng'] !== null) ? (float)$b['lng'] : 'NULL';
    if (!$nome || !$ip) {
        echo json_encode(['ok'=>false,'message'=>'Nome e IP sao obrigatorios.']);
        $db->close(); return;
    }
    vsol_ensure_olts_table($db);
    $db->query("INSERT INTO vsol_olts (nome,ip,usuario,senha,porta_ssh,modelo,endereco,lat,lng)
                VALUES ('{$nome}','{$ip}','{$usuario}','{$senha}',{$porta},'{$modelo}','{$endereco}',{$latSql},{$lngSql})");
    if ($db->insert_id) {
        echo json_encode(['ok'=>true,'id'=>(int)$db->insert_id,'message'=>"OLT '{$nome}' cadastrada."]);
    } else {
        echo json_encode(['ok'=>false,'message'=>'Erro: '.$db->error]);
    }
    $db->close();
}

function action_update_olt() {
    $db = vsol_get_db();
    if (!$db) { echo json_encode(['ok'=>false,'message'=>'Banco nao disponivel.']); return; }
    $b  = json_decode(file_get_contents('php://input'), true);
    if (!$b) $b = [];
    $id = (int)(isset($b['id']) ? $b['id'] : 0);
    if (!$id) { echo json_encode(['ok'=>false,'message'=>'ID invalido.']); $db->close(); return; }
    $nome     = $db->real_escape_string(trim(isset($b['nome'])     ? $b['nome']     : ''));
    $ip       = $db->real_escape_string(trim(isset($b['ip'])       ? $b['ip']       : ''));
    $usuario  = $db->real_escape_string(trim(isset($b['usuario'])  ? $b['usuario']  : 'admin'));
    $porta    = (int)(isset($b['porta_ssh']) ? $b['porta_ssh'] : 22);
    $modelo   = $db->real_escape_string(trim(isset($b['modelo'])   ? $b['modelo']   : 'V1600G1'));
    $ativo    = (int)(isset($b['ativo']) ? $b['ativo'] : 1);
    $endereco = $db->real_escape_string(trim(isset($b['endereco']) ? $b['endereco'] : ''));
    $latSql   = (isset($b['lat']) && $b['lat'] !== '' && $b['lat'] !== null) ? (float)$b['lat'] : 'NULL';
    $lngSql   = (isset($b['lng']) && $b['lng'] !== '' && $b['lng'] !== null) ? (float)$b['lng'] : 'NULL';
    $sets = "nome='{$nome}',ip='{$ip}',usuario='{$usuario}',porta_ssh={$porta},modelo='{$modelo}',ativo={$ativo},endereco='{$endereco}',lat={$latSql},lng={$lngSql}";
    if (!empty($b['senha'])) {
        $senha = $db->real_escape_string(trim($b['senha']));
        $sets .= ",senha='{$senha}'";
    }
    $db->query("UPDATE vsol_olts SET {$sets} WHERE id={$id}");
    echo json_encode(['ok'=>true,'message'=>'OLT atualizada.']);
    $db->close();
}

function action_delete_olt() {
    $db = vsol_get_db();
    if (!$db) { echo json_encode(['ok'=>false,'message'=>'Banco nao disponivel.']); return; }
    $b  = json_decode(file_get_contents('php://input'), true);
    if (!$b) $b = [];
    $id = (int)(isset($b['id']) ? $b['id'] : (isset($_GET['id']) ? $_GET['id'] : 0));
    if (!$id) { echo json_encode(['ok'=>false,'message'=>'ID invalido.']); $db->close(); return; }
    $db->query("DELETE FROM vsol_olts WHERE id={$id}");
    $ok = $db->affected_rows > 0;
    echo json_encode(['ok'=>$ok,'message'=>$ok?'OLT removida.':'OLT nao encontrada.']);
    $db->close();
}

// ── SSH Query OLT VSOL ────────────────────────────────────────────────────────

function action_query_olt() {
    $autoload = __DIR__ . '/../vendor/autoload.php';
    if (!file_exists($autoload)) {
        echo json_encode(['ok'=>false,'message'=>'phpseclib nao instalado.']); return;
    }
    require_once $autoload;
    $b  = json_decode(file_get_contents('php://input'), true);
    if (!$b) $b = [];
    $id = (int)(isset($b['id']) ? $b['id'] : (isset($_GET['id']) ? $_GET['id'] : 0));
    if (!$id) { echo json_encode(['ok'=>false,'message'=>'ID da OLT obrigatorio.']); return; }
    $db = vsol_get_db();
    if (!$db) { echo json_encode(['ok'=>false,'message'=>'Banco nao disponivel.']); return; }
    $r = $db->query("SELECT * FROM vsol_olts WHERE id={$id} AND ativo=1");
    if (!$r || !($olt=$r->fetch_assoc())) {
        echo json_encode(['ok'=>false,'message'=>'OLT nao encontrada ou inativa.']);
        $db->close(); return;
    }
    $db->close();
    $ip       = $olt['ip'];
    $user     = $olt['usuario'];
    $pass     = $olt['senha'];
    $port     = (int)(isset($olt['porta_ssh']) ? $olt['porta_ssh'] : 22);
    $modelo   = strtoupper($olt['modelo']);
    $nome     = $olt['nome'];
    $isEpon   = strpos($modelo,'V1600D') !== false;
    $ponCount = vsol_pon_count($modelo);
    try {
        $ssh = new \phpseclib3\Net\SSH2($ip, $port);
        $ssh->setTimeout(15);
        if (!$ssh->login($user, $pass)) {
            echo json_encode(['ok'=>false,'message'=>"Login SSH falhou em {$ip}."]); return;
        }
        $onus   = vsol_collect_onus($ssh, $isEpon, $ponCount, (int)$id, $nome);
        vsol_store_onus($onus, (int)$id);
        $total  = count($onus);
        $online = 0;
        foreach ($onus as $o) {
            if (isset($o['status']) && $o['status'] === 'online') $online++;
        }
        $dbUp = vsol_get_db();
        if ($dbUp) { $dbUp->query("UPDATE vsol_olts SET ativo=1 WHERE id={$id}"); $dbUp->close(); }
        echo json_encode(['ok'=>true,'message'=>"OLT {$nome}: {$total} ONUs.",'onus'=>$onus,'total'=>$total,'online'=>$online]);
    } catch (\Exception $e) {
        echo json_encode(['ok'=>false,'message'=>'Erro SSH: '.$e->getMessage()]);
    }
}

function vsol_pon_count($modelo) {
    $map = ['V1600G1'=>8,'V1600G2'=>16,'V1600G4'=>4,'V1600G5'=>8,'V1600G8'=>8,
            'V1800G'=>16,'V2802G'=>2,'V2801RH'=>1,'V1600D4'=>4,'V1600D8'=>8];
    foreach ($map as $k => $v) { if (strpos($modelo,$k)!==false) return $v; }
    return 8;
}

function vsol_collect_onus($ssh, $isEpon, $ponCount, $oltId, $oltNome) {
    $onus   = [];
    $prompt = '/[>#]\s*$/';
    $ssh->read($prompt, \phpseclib3\Net\SSH2::READ_REGEX);
    for ($p=1; $p<=$ponCount; $p++) {
        $portStr = "1/1/{$p}";
        $ifStr   = $isEpon ? "epon-olt_{$portStr}" : "gpon-olt_{$portStr}";
        $cmd     = $isEpon ? "show epon onu state {$ifStr}" : "show gpon onu state {$ifStr}";
        $ssh->write($cmd."\n");
        $out      = $ssh->read($prompt, \phpseclib3\Net\SSH2::READ_REGEX);
        $stateMap = vsol_parse_onu_state($out, $oltId, $p);
        $signalMap= [];
        if (!$isEpon && !empty($stateMap)) {
            $ssh->write("show pon power attenuation gpon-olt_{$portStr}\n");
            $outSig    = $ssh->read($prompt, \phpseclib3\Net\SSH2::READ_REGEX);
            $signalMap = vsol_parse_signal($outSig);
        }
        foreach ($stateMap as $idx => $onu) {
            if (isset($signalMap[$idx])) {
                $onu['signalRx'] = $signalMap[$idx]['rx'];
                $onu['signalTx'] = $signalMap[$idx]['tx'];
            }
            $onus[] = $onu;
        }
    }
    return $onus;
}

function vsol_parse_onu_state($out, $oltId, $ponPort) {
    $result = [];
    foreach (explode("\n",$out) as $line) {
        $line = trim($line);
        if (!$line || preg_match('/^[-=]+$/',$line) || preg_match('/^(ONU|Index|\s*#)/i',$line)) continue;
        if (!preg_match('/^\s*(\d+)\s+(\S+)\s+(\S{4,16})\s*(.*?)(?:\s+\d+m)?\s*([\-\d\.]+)?\s*([\-\d\.]+)?\s*$/',$line,$m)) continue;
        $idx    = (int)$m[1];
        $status = vsol_normalize_status($m[2]);
        $sn     = trim($m[3]);
        $desc   = trim(preg_replace('/\s{2,}.*$/','',$m[4]));
        $rx     = (isset($m[5]) && $m[5]!=='') ? (float)$m[5] : 0.0;
        $tx     = (isset($m[6]) && $m[6]!=='') ? (float)$m[6] : 0.0;
        $result[$idx] = [
            'id'           => "{$oltId}_{$ponPort}_{$idx}",
            'serialNumber' => $sn,
            'name'         => ($desc ? $desc : $sn),
            'oltId'        => (string)$oltId,
            'ponPort'      => $ponPort,
            'onuIndex'     => $idx,
            'signalRx'     => $rx,
            'signalTx'     => $tx,
            'status'       => $status,
            'ip'           => '',
            'vlan'         => 0,
            'updatedAt'    => date('Y-m-d H:i:s'),
        ];
    }
    return $result;
}

function vsol_parse_signal($out) {
    $result = [];
    foreach (explode("\n",$out) as $line) {
        $line = trim($line);
        if (!$line || preg_match('/^[-=]+$/',$line) || preg_match('/^(ONU|Index)/i',$line)) continue;
        if (preg_match('/^\s*(\d+)\s+([\-\d\.]+)\s+([\-\d\.]+)/',$line,$m))
            $result[(int)$m[1]] = ['rx'=>(float)$m[2],'tx'=>(float)$m[3]];
    }
    return $result;
}

function vsol_normalize_status($s) {
    $s = strtolower(trim($s));
    if (in_array($s,['up','online','enable','enabled','auto'])) return 'online';
    if ($s==='los') return 'los';
    if (in_array($s,['disable','disabled','admin-down','deactive'])) return 'desligada';
    return 'offline';
}

function vsol_store_onus($onus, $oltId) {
    $db = vsol_get_db();
    if (!$db) return;
    $db->query("CREATE TABLE IF NOT EXISTS `vsol_onus` (
        `id`         int(11)      NOT NULL AUTO_INCREMENT,
        `id_olt`     int(11)      NOT NULL,
        `id_pon`     int(11)      NOT NULL DEFAULT 0,
        `onu_index`  int(11)      NOT NULL DEFAULT 0,
        `sn`         varchar(50)  DEFAULT '',
        `descricao`  varchar(200) DEFAULT '',
        `status_onu` varchar(20)  DEFAULT 'offline',
        `rx`         float        DEFAULT 0,
        `tx`         float        DEFAULT 0,
        `ip`         varchar(50)  DEFAULT '',
        `vlan`       int(11)      DEFAULT 0,
        `updated_at` datetime     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        UNIQUE KEY `uk_olt_pon_idx` (`id_olt`,`id_pon`,`onu_index`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;");
    foreach ($onus as $onu) {
        $idOlt  = (int)$oltId;
        $idPon  = (int)(isset($onu['ponPort'])    ? $onu['ponPort']    : 0);
        $idx    = (int)(isset($onu['onuIndex'])   ? $onu['onuIndex']   : 0);
        $sn     = $db->real_escape_string(isset($onu['serialNumber']) ? $onu['serialNumber'] : '');
        $desc   = $db->real_escape_string(isset($onu['name'])         ? $onu['name']         : '');
        $status = $db->real_escape_string(isset($onu['status'])       ? $onu['status']       : 'offline');
        $rx     = (float)(isset($onu['signalRx']) ? $onu['signalRx'] : 0);
        $tx     = (float)(isset($onu['signalTx']) ? $onu['signalTx'] : 0);
        $ip     = $db->real_escape_string(isset($onu['ip'])  ? $onu['ip']  : '');
        $vlan   = (int)(isset($onu['vlan']) ? $onu['vlan'] : 0);
        $db->query("INSERT INTO vsol_onus (id_olt,id_pon,onu_index,sn,descricao,status_onu,rx,tx,ip,vlan)
                    VALUES ({$idOlt},{$idPon},{$idx},'{$sn}','{$desc}','{$status}',{$rx},{$tx},'{$ip}',{$vlan})
                    ON DUPLICATE KEY UPDATE
                        sn='{$sn}',descricao='{$desc}',status_onu='{$status}',
                        rx={$rx},tx={$tx},ip='{$ip}',vlan={$vlan},updated_at=NOW()");
        $db->query("INSERT INTO vsol_onus_historico (id_olt,id_pon,onu_index,sn,status_onu,rx,tx)
                    VALUES ({$idOlt},{$idPon},{$idx},'{$sn}','{$status}',{$rx},{$tx})");
    }
    $db->close();
}


// ── CTOs ──────────────────────────────────────────────────────────────────────

function vsol_ensure_ctos_table($db) {
    $db->query("CREATE TABLE IF NOT EXISTS `vsol_ctos` (
        `id`         int(11)      NOT NULL AUTO_INCREMENT,
        `nome`       varchar(100) NOT NULL DEFAULT '',
        `descricao`  text         DEFAULT '',
        `capacidade` int(11)      NOT NULL DEFAULT 16,
        `tipo`       varchar(30)  NOT NULL DEFAULT 'CTO',
        `id_olt`     int(11)      DEFAULT NULL,
        `id_pon`     int(11)      DEFAULT NULL,
        `endereco`   varchar(255) DEFAULT '',
        `lat`        decimal(10,7) DEFAULT NULL,
        `lng`        decimal(10,7) DEFAULT NULL,
        `ativo`      tinyint(1)   NOT NULL DEFAULT 1,
        `created_at` datetime     DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;");
    $db->query("CREATE TABLE IF NOT EXISTS `vsol_cto_clientes` (
        `id`         int(11)      NOT NULL AUTO_INCREMENT,
        `id_cto`     int(11)      NOT NULL,
        `login`      varchar(100) NOT NULL DEFAULT '',
        `porta`      int(11)      DEFAULT NULL,
        `sn_onu`     varchar(50)  DEFAULT '',
        `created_at` datetime     DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        UNIQUE KEY `uk_cto_login` (`id_cto`, `login`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;");
    $db->query("CREATE TABLE IF NOT EXISTS `vsol_onus_historico` (
        `id`            int(11)    NOT NULL AUTO_INCREMENT,
        `id_olt`        int(11)    NOT NULL,
        `id_pon`        int(11)    NOT NULL DEFAULT 0,
        `onu_index`     int(11)    NOT NULL DEFAULT 0,
        `sn`            varchar(50) DEFAULT '',
        `status_onu`    varchar(20) DEFAULT 'offline',
        `rx`            float      DEFAULT 0,
        `tx`            float      DEFAULT 0,
        `registrado_em` datetime   DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `idx_sn` (`sn`),
        KEY `idx_data` (`registrado_em`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;");
}

function action_list_ctos() {
    $db = vsol_get_db();
    if (!$db) { echo json_encode(['ok'=>false,'ctos'=>[]]); return; }
    vsol_ensure_ctos_table($db);
    $r = $db->query("SELECT c.*, o.nome as olt_nome,
        (SELECT COUNT(*) FROM vsol_cto_clientes cc WHERE cc.id_cto = c.id) as total_clientes
        FROM vsol_ctos c LEFT JOIN vsol_olts o ON o.id = c.id_olt
        WHERE c.ativo = 1 ORDER BY c.nome");
    $rows = [];
    if ($r) while ($row = $r->fetch_assoc()) {
        $row['id']             = (int)$row['id'];
        $row['capacidade']     = (int)$row['capacidade'];
        $row['total_clientes'] = (int)$row['total_clientes'];
        $rows[] = $row;
    }
    $db->close();
    echo json_encode(['ok'=>true,'ctos'=>$rows]);
}

function action_add_cto() {
    $db = vsol_get_db();
    if (!$db) { echo json_encode(['ok'=>false,'message'=>'Banco indisponivel.']); return; }
    vsol_ensure_ctos_table($db);
    $b         = json_decode(file_get_contents('php://input'), true) ?? [];
    $nome      = $db->real_escape_string(trim($b['nome']      ?? ''));
    $descricao = $db->real_escape_string(trim($b['descricao'] ?? ''));
    $tipo      = $db->real_escape_string(trim($b['tipo']      ?? 'CTO'));
    $cap       = (int)($b['capacidade'] ?? 16);
    $id_olt    = isset($b['id_olt']) && $b['id_olt'] ? (int)$b['id_olt'] : 'NULL';
    $id_pon    = isset($b['id_pon']) && $b['id_pon'] ? (int)$b['id_pon'] : 'NULL';
    $endereco  = $db->real_escape_string(trim($b['endereco']  ?? ''));
    $lat       = isset($b['lat']) && $b['lat'] !== '' ? (float)$b['lat'] : 'NULL';
    $lng       = isset($b['lng']) && $b['lng'] !== '' ? (float)$b['lng'] : 'NULL';
    if (!$nome) { echo json_encode(['ok'=>false,'message'=>'Nome obrigatorio.']); $db->close(); return; }
    $db->query("INSERT INTO vsol_ctos (nome,descricao,tipo,capacidade,id_olt,id_pon,endereco,lat,lng)
                VALUES ('{$nome}','{$descricao}','{$tipo}',{$cap},{$id_olt},{$id_pon},'{$endereco}',{$lat},{$lng})");
    $id = $db->insert_id;
    $db->close();
    echo json_encode($id ? ['ok'=>true,'id'=>(int)$id,'message'=>"CTO '{$nome}' criada."] : ['ok'=>false,'message'=>'Erro ao inserir.']);
}

function action_update_cto() {
    $db = vsol_get_db();
    if (!$db) { echo json_encode(['ok'=>false,'message'=>'Banco indisponivel.']); return; }
    $b    = json_decode(file_get_contents('php://input'), true) ?? [];
    $id   = (int)($b['id'] ?? 0);
    if (!$id) { echo json_encode(['ok'=>false,'message'=>'ID invalido.']); $db->close(); return; }
    $nome      = $db->real_escape_string(trim($b['nome']      ?? ''));
    $descricao = $db->real_escape_string(trim($b['descricao'] ?? ''));
    $tipo      = $db->real_escape_string(trim($b['tipo']      ?? 'CTO'));
    $cap       = (int)($b['capacidade'] ?? 16);
    $id_olt    = isset($b['id_olt']) && $b['id_olt'] ? (int)$b['id_olt'] : 'NULL';
    $id_pon    = isset($b['id_pon']) && $b['id_pon'] ? (int)$b['id_pon'] : 'NULL';
    $endereco  = $db->real_escape_string(trim($b['endereco']  ?? ''));
    $lat       = isset($b['lat']) && $b['lat'] !== '' ? (float)$b['lat'] : 'NULL';
    $lng       = isset($b['lng']) && $b['lng'] !== '' ? (float)$b['lng'] : 'NULL';
    $db->query("UPDATE vsol_ctos SET nome='{$nome}',descricao='{$descricao}',tipo='{$tipo}',
                capacidade={$cap},id_olt={$id_olt},id_pon={$id_pon},endereco='{$endereco}',lat={$lat},lng={$lng}
                WHERE id={$id}");
    $db->close();
    echo json_encode(['ok'=>true,'message'=>'CTO atualizada.']);
}

function action_delete_cto() {
    $db = vsol_get_db();
    if (!$db) { echo json_encode(['ok'=>false,'message'=>'Banco indisponivel.']); return; }
    $b  = json_decode(file_get_contents('php://input'), true) ?? [];
    $id = (int)($b['id'] ?? $_GET['id'] ?? 0);
    if (!$id) { echo json_encode(['ok'=>false,'message'=>'ID invalido.']); $db->close(); return; }
    $db->query("UPDATE vsol_ctos SET ativo=0 WHERE id={$id}");
    $db->close();
    echo json_encode(['ok'=>true,'message'=>'CTO removida.']);
}

function action_list_cto_clients() {
    $db     = vsol_get_db();
    if (!$db) { echo json_encode(['ok'=>false,'clientes'=>[]]); return; }
    $id_cto = (int)($_GET['id_cto'] ?? 0);
    if (!$id_cto) { echo json_encode(['ok'=>false,'message'=>'id_cto obrigatorio.']); $db->close(); return; }
    $clientes = [];
    $r = $db->query("SELECT cc.*, c.nome, c.email, c.fone FROM vsol_cto_clientes cc
                     LEFT JOIN clientes c ON c.login = cc.login
                     WHERE cc.id_cto = {$id_cto} ORDER BY cc.porta");
    if ($r) while ($row = $r->fetch_assoc()) $clientes[] = $row;
    $db->close();
    echo json_encode(['ok'=>true,'clientes'=>$clientes]);
}

function action_assign_client() {
    $db = vsol_get_db();
    if (!$db) { echo json_encode(['ok'=>false,'message'=>'Banco indisponivel.']); return; }
    vsol_ensure_ctos_table($db);
    $b      = json_decode(file_get_contents('php://input'), true) ?? [];
    $id_cto = (int)($b['id_cto'] ?? 0);
    $login  = $db->real_escape_string(trim($b['login'] ?? ''));
    $porta  = isset($b['porta']) && $b['porta'] !== '' ? (int)$b['porta'] : 'NULL';
    $sn_onu = $db->real_escape_string(trim($b['sn_onu'] ?? ''));
    if (!$id_cto || !$login) { echo json_encode(['ok'=>false,'message'=>'id_cto e login obrigatorios.']); $db->close(); return; }
    $db->query("INSERT INTO vsol_cto_clientes (id_cto,login,porta,sn_onu) VALUES ({$id_cto},'{$login}',{$porta},'{$sn_onu}')
                ON DUPLICATE KEY UPDATE porta={$porta}, sn_onu='{$sn_onu}'");
    $db->close();
    echo json_encode(['ok'=>true,'message'=>'Cliente associado a CTO.']);
}

function action_remove_client() {
    $db = vsol_get_db();
    if (!$db) { echo json_encode(['ok'=>false,'message'=>'Banco indisponivel.']); return; }
    $b      = json_decode(file_get_contents('php://input'), true) ?? [];
    $id_cto = (int)($b['id_cto'] ?? 0);
    $login  = $db->real_escape_string(trim($b['login'] ?? ''));
    $db->query("DELETE FROM vsol_cto_clientes WHERE id_cto={$id_cto} AND login='{$login}'");
    $db->close();
    echo json_encode(['ok'=>true,'message'=>'Associacao removida.']);
}

// ── Importar KML/KMZ ──────────────────────────────────────────────────────────

function action_import_kml() {
    $db = vsol_get_db();
    if (!$db) { echo json_encode(['ok'=>false,'message'=>'Banco indisponivel.']); return; }
    vsol_ensure_ctos_table($db);

    if (empty($_FILES['arquivo'])) {
        echo json_encode(['ok'=>false,'message'=>'Nenhum arquivo enviado.']); return;
    }
    $file    = $_FILES['arquivo']['tmp_name'];
    $fname   = strtolower($_FILES['arquivo']['name']);
    $kmlText = '';

    if (substr($fname, -4) === '.kmz') {
        if (!class_exists('ZipArchive')) {
            echo json_encode(['ok'=>false,'message'=>'ZipArchive nao disponivel no PHP.']); return;
        }
        $zip = new ZipArchive();
        if ($zip->open($file) !== true) {
            echo json_encode(['ok'=>false,'message'=>'Falha ao abrir KMZ.']); return;
        }
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $n = $zip->getNameIndex($i);
            if (substr(strtolower($n), -4) === '.kml') {
                $kmlText = $zip->getFromIndex($i);
                break;
            }
        }
        $zip->close();
        if (!$kmlText) { echo json_encode(['ok'=>false,'message'=>'KML nao encontrado dentro do KMZ.']); return; }
    } elseif (substr($fname, -4) === '.kml') {
        $kmlText = file_get_contents($file);
    } else {
        echo json_encode(['ok'=>false,'message'=>'Formato invalido. Use .kml ou .kmz.']); return;
    }

    libxml_use_internal_errors(true);
    $xml = simplexml_load_string($kmlText);
    if (!$xml) {
        echo json_encode(['ok'=>false,'message'=>'KML invalido ou corrompido.']); return;
    }

    $xml->registerXPathNamespace('kml', 'http://www.opengis.net/kml/2.2');
    $placemarks = $xml->xpath('//Placemark') ?: $xml->xpath('//kml:Placemark') ?: [];
    if (empty($placemarks)) {
        $placemarks = kml_find_placemarks($xml);
    }

    $importados = 0;
    $ignorados  = 0;
    $detalhes   = [];

    foreach ($placemarks as $pm) {
        $nome = trim((string)($pm->name ?? $pm->Nome ?? ''));
        if (!$nome) { $ignorados++; continue; }

        $coordStr = '';
        if (isset($pm->Point->coordinates)) {
            $coordStr = trim((string)$pm->Point->coordinates);
        } elseif (isset($pm->MultiGeometry->Point->coordinates)) {
            $coordStr = trim((string)$pm->MultiGeometry->Point->coordinates);
        }

        $lat = null; $lng = null;
        if ($coordStr) {
            $parts = explode(',', $coordStr);
            if (count($parts) >= 2) {
                $lng = (float)trim($parts[0]);
                $lat = (float)trim($parts[1]);
            }
        }

        $tipo    = kml_detect_type($nome, (string)($pm->description ?? ''));
        $desc    = $db->real_escape_string(trim(strip_tags((string)($pm->description ?? ''))));
        $nomeSql = $db->real_escape_string($nome);
        $latSql  = $lat !== null ? $lat : 'NULL';
        $lngSql  = $lng !== null ? $lng : 'NULL';
        $cap     = ($tipo === 'SPLITTER') ? 8 : 16;

        $db->query("INSERT INTO vsol_ctos (nome,descricao,tipo,capacidade,lat,lng)
                    VALUES ('{$nomeSql}','{$desc}','{$tipo}',{$cap},{$latSql},{$lngSql})
                    ON DUPLICATE KEY UPDATE descricao='{$desc}',lat={$latSql},lng={$lngSql}");
        $importados++;
        $detalhes[] = ['nome'=>$nome,'tipo'=>$tipo,'lat'=>$lat,'lng'=>$lng];
    }

    $db->close();
    echo json_encode([
        'ok'         => true,
        'importados' => $importados,
        'ignorados'  => $ignorados,
        'message'    => "{$importados} elemento(s) importado(s) do KML/KMZ.",
        'detalhes'   => array_slice($detalhes, 0, 20),
    ]);
}

function kml_find_placemarks($xml) {
    $result = [];
    foreach ($xml->children() as $child) {
        if (strtolower($child->getName()) === 'placemark') {
            $result[] = $child;
        } else {
            $sub = kml_find_placemarks($child);
            foreach ($sub as $s) $result[] = $s;
        }
    }
    return $result;
}

function kml_detect_type($nome, $desc) {
    $text = strtoupper($nome . ' ' . $desc);
    if (strpos($text, 'CTO')      !== false) return 'CTO';
    if (strpos($text, 'CEO')      !== false) return 'CEO';
    if (strpos($text, 'SPLITTER') !== false) return 'SPLITTER';
    if (strpos($text, 'OLT')      !== false) return 'OLT';
    if (strpos($text, 'DIO')      !== false) return 'DIO';
    if (strpos($text, 'POSTE')    !== false) return 'POSTE';
    if (strpos($text, 'CABO')     !== false) return 'CABO';
    if (strpos($text, 'CLIENTE')  !== false) return 'CLIENTE';
    return 'CTO';
}

// ── Mapa completo (OLTs + CTOs + clientes) ────────────────────────────────────

function action_maps_full() {
    $db = vsol_get_db();
    if (!$db) { echo json_encode(['ok'=>false,'items'=>[],'mapsKey'=>'']); return; }
    vsol_ensure_ctos_table($db);
    $items = []; $mapsKey = '';

    $r = $db->query("SHOW TABLES LIKE 'vsol_config'");
    if ($r && $r->num_rows > 0) {
        $r2 = $db->query("SELECT key_google_maps FROM vsol_config LIMIT 1");
        if ($r2 && $row = $r2->fetch_assoc()) $mapsKey = $row['key_google_maps'] ?? '';
    }

    $r = $db->query("SELECT * FROM vsol_olts WHERE ativo=1");
    if ($r) while ($row = $r->fetch_assoc()) {
        $items[] = ['type'=>'olt','id'=>'olt_'.$row['id'],'name'=>$row['nome'],
                    'ip'=>$row['ip'],'model'=>$row['modelo'],'status'=>'online',
                    'lat'=>$row['lat']!==null?(float)$row['lat']:null,
                    'lng'=>$row['lng']!==null?(float)$row['lng']:null];
    }

    $r = $db->query("SELECT c.*, o.nome as olt_nome,
        (SELECT COUNT(*) FROM vsol_cto_clientes cc WHERE cc.id_cto=c.id) as total_clientes
        FROM vsol_ctos c LEFT JOIN vsol_olts o ON o.id=c.id_olt WHERE c.ativo=1");
    if ($r) while ($row = $r->fetch_assoc()) {
        $items[] = ['type'=>'cto','id'=>'cto_'.$row['id'],'name'=>$row['nome'],
                    'tipo'=>$row['tipo'],'capacidade'=>(int)$row['capacidade'],
                    'total_clientes'=>(int)$row['total_clientes'],
                    'olt_nome'=>$row['olt_nome']??'','id_olt'=>$row['id_olt'],'id_pon'=>$row['id_pon'],
                    'lat'=>$row['lat']!==null?(float)$row['lat']:null,
                    'lng'=>$row['lng']!==null?(float)$row['lng']:null];
    }

    $r = $db->query("SHOW TABLES LIKE 'clientes'");
    if ($r && $r->num_rows > 0) {
        $r2 = $db->query("SELECT cl.login, cl.nome, cl.endereco, cl.bairro, cl.cidade,
            cc.id_cto, cc.porta, cc.sn_onu
            FROM clientes cl
            LEFT JOIN vsol_cto_clientes cc ON cc.login = cl.login
            WHERE cl.endereco != '' LIMIT 500");
        if ($r2) while ($row = $r2->fetch_assoc()) {
            $items[] = ['type'=>'client','id'=>'cli_'.$row['login'],'name'=>$row['nome']?:$row['login'],
                        'login'=>$row['login'],'id_cto'=>$row['id_cto'],
                        'address'=>trim($row['endereco'].', '.$row['bairro'].', '.$row['cidade']),
                        'lat'=>null,'lng'=>null];
        }
    }

    $db->close();
    echo json_encode(['ok'=>true,'items'=>$items,'mapsKey'=>$mapsKey]);
}

// ── IA Gratuita: Analise de Rede ─────────────────────────────────────────────

function action_ai_analise() {
    $db = vsol_get_db();
    if (!$db) { echo json_encode(['ok'=>false,'insights'=>[],'message'=>'Banco indisponivel.']); return; }
    vsol_ensure_ctos_table($db);

    $insights = [];

    // 1. Analise por PON: detecta PONs com muitas ONUs offline
    $r = $db->query("SELECT id_olt, id_pon,
        COUNT(*) as total,
        SUM(CASE WHEN status_onu IN ('offline','los') THEN 1 ELSE 0 END) as offline,
        SUM(CASE WHEN status_onu='online' THEN 1 ELSE 0 END) as online,
        AVG(rx) as media_rx, MIN(rx) as min_rx, MAX(rx) as max_rx
        FROM vsol_onus WHERE id_olt > 0
        GROUP BY id_olt, id_pon HAVING total > 0");
    if ($r) while ($row = $r->fetch_assoc()) {
        $pct_off = $row['total'] > 0 ? ($row['offline'] / $row['total']) * 100 : 0;
        $olt_id  = (int)$row['id_olt'];
        $pon     = (int)$row['id_pon'];

        $ro = $db->query("SELECT nome FROM vsol_olts WHERE id={$olt_id}");
        $olt_nome = ($ro && $on = $ro->fetch_assoc()) ? $on['nome'] : "OLT #{$olt_id}";

        if ($pct_off >= 80 && $row['offline'] >= 3) {
            $insights[] = [
                'severidade' => 'critico',
                'tipo'       => 'fibra_ou_splitter',
                'titulo'     => "PON {$pon} da {$olt_nome}: provavel corte de fibra ou splitter",
                'descricao'  => "{$row['offline']} de {$row['total']} ONUs offline (".round($pct_off,1)."%). Quando a maioria de uma PON cai ao mesmo tempo, geralmente e fibra cortada ou splitter com defeito antes da bifurcacao.",
                'acao'       => "Verifique a fibra e o splitter do tronco da PON 1/1/{$pon} da {$olt_nome}.",
                'dados'      => ['olt'=>$olt_nome,'pon'=>$pon,'offline'=>(int)$row['offline'],'total'=>(int)$row['total']],
            ];
        } elseif ($pct_off >= 30 && $pct_off < 80 && $row['offline'] >= 2) {
            $insights[] = [
                'severidade' => 'alerta',
                'tipo'       => 'splitter_parcial',
                'titulo'     => "PON {$pon} da {$olt_nome}: possivel problema em splitter secundario",
                'descricao'  => "{$row['offline']} de {$row['total']} ONUs offline (".round($pct_off,1)."%). Falha parcial de PON sugere splitter secundario com defeito ou emenda ruim.",
                'acao'       => "Rastreie a rota dos clientes offline: provavelmente compartilham um splitter de 2a etapa.",
                'dados'      => ['olt'=>$olt_nome,'pon'=>$pon,'offline'=>(int)$row['offline'],'total'=>(int)$row['total']],
            ];
        }

        if ($row['online'] > 0 && $row['media_rx'] < -28) {
            $insights[] = [
                'severidade' => 'aviso',
                'tipo'       => 'sinal_degradado',
                'titulo'     => "PON {$pon} da {$olt_nome}: sinal medio abaixo do ideal",
                'descricao'  => "Sinal medio de ".round($row['media_rx'],1)." dBm. Min: ".round($row['min_rx'],1)." dBm. Fibra longa, emenda com perda ou conector sujo.",
                'acao'       => "Inspecione conectores e emendas da PON 1/1/{$pon}. Considere balancear clientes com splitter adicional.",
                'dados'      => ['olt'=>$olt_nome,'pon'=>$pon,'media_rx'=>round((float)$row['media_rx'],2),'min_rx'=>round((float)$row['min_rx'],2)],
            ];
        }
    }

    // 2. ONUs com sinal instavel (variacao historica)
    $r = $db->query("SELECT sn,
        COUNT(*) as leituras,
        AVG(rx) as media, STDDEV(rx) as desvio, MIN(rx) as minimo, MAX(rx) as maximo
        FROM vsol_onus_historico
        WHERE registrado_em >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND rx < 0
        GROUP BY sn HAVING leituras >= 3 AND desvio > 2
        ORDER BY desvio DESC LIMIT 10");
    if ($r) while ($row = $r->fetch_assoc()) {
        $ro = $db->query("SELECT descricao FROM vsol_onus WHERE sn='".$db->real_escape_string($row['sn'])."' LIMIT 1");
        $desc = ($ro && $on = $ro->fetch_assoc()) ? $on['descricao'] : $row['sn'];
        $insights[] = [
            'severidade' => 'alerta',
            'tipo'       => 'sinal_instavel',
            'titulo'     => "ONU instavel: {$desc}",
            'descricao'  => "Sinal variando ".round((float)$row['minimo'],1)." a ".round((float)$row['maximo'],1)." dBm (desvio ".round((float)$row['desvio'],2)." dBm) nos ultimos 7 dias. Conector, microbend ou problema na ONU.",
            'acao'       => "Limpe e re-teste o conector da ONU. Se persistir, troque o patch cord ou a ONU.",
            'dados'      => ['sn'=>$row['sn'],'nome'=>$desc,'desvio'=>round((float)$row['desvio'],2),'media'=>round((float)$row['media'],2)],
        ];
    }

    // 3. CTOs acima de 80% de capacidade
    $r = $db->query("SELECT c.nome, c.capacidade,
        (SELECT COUNT(*) FROM vsol_cto_clientes cc WHERE cc.id_cto=c.id) as usados
        FROM vsol_ctos c WHERE c.ativo=1 AND c.capacidade > 0");
    if ($r) while ($row = $r->fetch_assoc()) {
        $pct = $row['capacidade'] > 0 ? ($row['usados'] / $row['capacidade']) * 100 : 0;
        if ($pct >= 80) {
            $insights[] = [
                'severidade' => 'aviso',
                'tipo'       => 'cto_lotada',
                'titulo'     => "CTO {$row['nome']} com ".round($pct,1)."% de capacidade",
                'descricao'  => "{$row['usados']} de {$row['capacidade']} portas em uso. Proximo do limite, novas instalacoes podem nao ter porta disponivel.",
                'acao'       => "Planeje expansao da CTO ou redirecione proximas instalacoes para CTOs vizinhas com capacidade.",
                'dados'      => ['cto'=>$row['nome'],'usados'=>(int)$row['usados'],'capacidade'=>(int)$row['capacidade']],
            ];
        }
    }

    // 4. Saude geral da rede
    $r = $db->query("SELECT COUNT(*) as total, SUM(CASE WHEN status_onu='online' THEN 1 ELSE 0 END) as online FROM vsol_onus");
    $resumo = ['total'=>0,'online'=>0,'uptime'=>0];
    if ($r && $row = $r->fetch_assoc()) {
        $resumo['total']  = (int)$row['total'];
        $resumo['online'] = (int)$row['online'];
        $resumo['uptime'] = $resumo['total'] > 0 ? round(($resumo['online']/$resumo['total'])*100,1) : 0;
    }

    if (empty($insights)) {
        $insights[] = [
            'severidade' => 'ok',
            'tipo'       => 'rede_saudavel',
            'titulo'     => 'Rede saudavel',
            'descricao'  => "Nenhuma anomalia detectada. {$resumo['online']} de {$resumo['total']} ONUs online ({$resumo['uptime']}% uptime).",
            'acao'       => 'Continue monitorando regularmente.',
            'dados'      => $resumo,
        ];
    }

    $ordem = ['critico'=>0,'alerta'=>1,'aviso'=>2,'ok'=>3];
    usort($insights, function($a, $b) use ($ordem) {
        return ($ordem[$a['severidade']]??9) - ($ordem[$b['severidade']]??9);
    });

    $db->close();
    echo json_encode(['ok'=>true,'insights'=>$insights,'resumo'=>$resumo,'gerado_em'=>date('d/m/Y H:i:s')]);
}
