<?php
session_start();
header('Content-Type: application/json');
define('LINK_STORAGE_DIR', __DIR__ . '/link_storage');
if (!is_dir(LINK_STORAGE_DIR)) {
    mkdir(LINK_STORAGE_DIR, 0755, true);
}
function isPremiumUser() {
    return isset($_SESSION['user_role']) && 
           ($_SESSION['user_role'] === 'admin' || $_SESSION['user_role'] === 'premium');
}
function isAdmin() {
    return isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin';
}
function generateShortCode($length = 6) {
    $characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    $maxAttempts = 100;
    for ($i = 0; $i < $maxAttempts; $i++) {
        $code = '';
        for ($j = 0; $j < $length; $j++) {
            $code .= $characters[random_int(0, strlen($characters) - 1)];
        }
        $filePath = LINK_STORAGE_DIR . '/' . $code . '.json';
        if (!file_exists($filePath)) {
            return $code;
        }
    }
    return generateShortCode($length + 1);
}
function saveLink($code, $compressedData) {
    $filePath = LINK_STORAGE_DIR . '/' . $code . '.json';
    $data = [
        'data' => $compressedData,
        'created' => time(),
        'clicks' => 0
    ];
    return file_put_contents($filePath, json_encode($data, JSON_PRETTY_PRINT)) !== false;
}
function getLink($code) {
    $code = preg_replace('/[^a-zA-Z0-9]/', '', $code);
    $filePath = LINK_STORAGE_DIR . '/' . $code . '.json';
    if (!file_exists($filePath)) {
        return null;
    }
    $json = file_get_contents($filePath);
    $linkData = json_decode($json, true);
    if (!$linkData) {
        return null;
    }
    $linkData['clicks']++;
    file_put_contents($filePath, json_encode($linkData, JSON_PRETTY_PRINT));
    return $linkData['data'];
}
function deleteLink($code) {
    $code = preg_replace('/[^a-zA-Z0-9]/', '', $code);
    $filePath = LINK_STORAGE_DIR . '/' . $code . '.json';
    if (file_exists($filePath)) {
        return unlink($filePath);
    }
    return false;
}
$action = $_GET['action'] ?? $_POST['action'] ?? '';
switch ($action) {
    case 'create':
        if (!isPremiumUser()) {
            http_response_code(403);
            echo json_encode(['error' => 'Premium access required']);
            exit;
        }
        $input = json_decode(file_get_contents('php://input'), true);
        $compressedData = $input['data'] ?? '';
        if (empty($compressedData)) {
            http_response_code(400);
            echo json_encode(['error' => 'No data provided']);
            exit;
        }
        $code = generateShortCode();
        if (!saveLink($code, $compressedData)) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to save link']);
            exit;
        }
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'];
        $basePath = dirname(dirname($_SERVER['SCRIPT_NAME']));
        $shortUrl = $protocol . '://' . $host . $basePath . '?c=' . $code;
        echo json_encode([
            'success' => true,
            'code' => $code,
            'url' => $shortUrl
        ]);
        break;
    case 'get':
        $code = $_GET['code'] ?? '';
        if (empty($code)) {
            http_response_code(400);
            echo json_encode(['error' => 'No code provided']);
            exit;
        }
        $data = getLink($code);
        if ($data === null) {
            http_response_code(404);
            echo json_encode(['error' => 'Link not found']);
            exit;
        }
        echo json_encode([
            'success' => true,
            'data' => $data
        ]);
        break;
    case 'delete':
        if (!isAdmin()) {
            http_response_code(403);
            echo json_encode(['error' => 'Admin access required']);
            exit;
        }
        $input = json_decode(file_get_contents('php://input'), true);
        $code = $input['code'] ?? '';
        if (empty($code)) {
            http_response_code(400);
            echo json_encode(['error' => 'No code provided']);
            exit;
        }
        $deleted = deleteLink($code);
        echo json_encode([
            'success' => $deleted,
            'message' => $deleted ? 'Link deleted' : 'Link not found'
        ]);
        break;
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action']);
        break;
}