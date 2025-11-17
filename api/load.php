<?php
include '../../check_auth.php';
header('Content-Type: application/json');
if (!empty($_SESSION['user'])) {
    $users = include __DIR__ . '/../../auth/users.php';
    if (isset($users[$_SESSION['user']])) {
        $response = [
            'success' => true,
            'scripts' => [
                'scripts/utils/find.js',
                'scripts/utils/p2p.js',
                'scripts/utils/api.js'
            ]
        ];
        echo json_encode($response);
    } else {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Unauthorized'
        ]);
    }
} else {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Unauthorized'
    ]);
}
?>