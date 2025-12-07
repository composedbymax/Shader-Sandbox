<?php
include '../../check_auth.php';
header('Content-Type: application/json');
$key = '01z7L6a';
if (!empty($_SESSION['user'])) {
    if (isset($users[$_SESSION['user']])) {
        $response = [
            'success' => true,
            'scripts' => [
                'scripts/utils/find.js',
                'scripts/utils/p2p.js',
                'scripts/utils/api.js',
                'scripts/utils/ai.js',
                'css/member.css'
            ]
        ];
        echo json_encode(['data' => base64_encode(json_encode($response) ^ str_repeat($key, 100))]);
    } else {
        http_response_code(401);
        $response = ['success' => false, 'error' => 'Unauthorized'];
        echo json_encode(['data' => base64_encode(json_encode($response) ^ str_repeat($key, 100))]);
    }
} else {
    http_response_code(401);
    $response = ['success' => false, 'error' => 'Unauthorized'];
    echo json_encode(['data' => base64_encode(json_encode($response) ^ str_repeat($key, 100))]);
}
?>