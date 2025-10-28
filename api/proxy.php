<?php
include '../../check_auth.php';
$allowedTypes = ['gallery', 'shader', 'image'];
$type = $_GET['type'] ?? '';
if (!in_array($type, $allowedTypes)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request type']);
    exit;
}
if ($type === 'gallery') {
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET');
    $page = intval($_GET['page'] ?? 0);
    $page = max(0, min(9999, $page));
    $url = "https://glslsandbox.com/?page={$page}";
    $html = @file_get_contents($url);
    if ($html === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch gallery']);
        exit;
    }
    preg_match_all('/<div class="effect">.*?<a href=\'\/e#([\d.]+)\'><img src=\'(\/thumbs\/\d+\.png)\'>.*?<\/div>/s', $html, $matches, PREG_SET_ORDER);
    $shaders = [];
    foreach ($matches as $match) {
        $shaders[] = [
            'id' => $match[1],
            'thumb' => $match[2]
        ];
    }
    echo json_encode([
        'page' => $page,
        'shaders' => $shaders,
        'count' => count($shaders)
    ]);
} elseif ($type === 'shader') {
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET');
    $id = $_GET['id'] ?? '';
    if (!preg_match('/^\d+\.\d+$/', $id)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid shader ID']);
        exit;
    }
    $url = "https://glslsandbox.com/item/{$id}";
    $json = @file_get_contents($url);
    if ($json === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch shader']);
        exit;
    }
    echo $json;
} elseif ($type === 'image') {
    $path = $_GET['path'] ?? '';
    if (!preg_match('/^\/thumbs\/\d+\.png$/', $path)) {
        http_response_code(400);
        echo 'Invalid image path';
        exit;
    }
    $url = "https://glslsandbox.com{$path}";
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => "User-Agent: Mozilla/5.0\r\n"
        ]
    ]);
    $imageData = @file_get_contents($url, false, $context);
    if ($imageData === false) {
        http_response_code(404);
        header('Content-Type: image/svg+xml');
        echo '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect fill="#222" width="400" height="200"/><text x="50%" y="50%" fill="#666" text-anchor="middle" dy=".3em" font-family="Arial" font-size="14">Image not available</text></svg>';
        exit;
    }
    header('Content-Type: image/png');
    header('Content-Length: ' . strlen($imageData));
    header('Cache-Control: public, max-age=86400');
    echo $imageData;
}
?>