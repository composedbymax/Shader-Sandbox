<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');
$jsonFile = 'list.json';
if (!file_exists($jsonFile)) {
    echo json_encode(['error' => 'No shaders found']);
    exit;
}
$shaders = json_decode(file_get_contents($jsonFile), true);
if (!$shaders) {
    echo json_encode(['error' => 'Invalid shader data']);
    exit;
}
function generateShaderToken($shader, $index) {
    $data = json_encode($shader) . $index . 'salt_string_2024';
    return substr(hash('sha256', $data), 0, 16);
}
function getTokenToIndexMap($shaders) {
    $map = [];
    foreach ($shaders as $index => $shader) {
        $token = generateShaderToken($shader, $index);
        $map[$token] = $index;
    }
    return $map;
}
$action = $_GET['action'] ?? '';
switch ($action) {
    case 'list':
        $lightList = [];
        foreach ($shaders as $index => $shader) {
            $token = generateShaderToken($shader, $index);
            $lightList[] = [
                'token' => $token,
                'title' => $shader['title'] ?? 'Untitled',
                'preview' => $shader['preview'] ?? '',
                'user' => $shader['user'] ?? 'Unknown'
            ];
        }
        echo json_encode($lightList);
        break;
    case 'load':
        $token = $_GET['token'] ?? '';
        $tokenMap = getTokenToIndexMap($shaders);
        if (isset($tokenMap[$token])) {
            $index = $tokenMap[$token];
            echo json_encode($shaders[$index]);
        } else {
            echo json_encode(['error' => 'Shader not found']);
        }
        break;
    default:
        echo json_encode(['error' => 'Invalid action. Use action=list or action=load&token=X']);
}
?>