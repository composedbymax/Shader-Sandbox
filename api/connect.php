<?php
include '../../check_auth.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}
$roomsDir = __DIR__ . '/webrtc_rooms/';
if (!is_dir($roomsDir)) {
    mkdir($roomsDir, 0755, true);
}
$currentTime = time();
$files = glob($roomsDir . '*.json');
foreach ($files as $file) {
    if (filemtime($file) < ($currentTime - 3600)) {
        unlink($file);
    }
}
function getRoomFilePath($joinCode) {
    global $roomsDir;
    return $roomsDir . $joinCode . '.json';
}
function loadRoom($joinCode) {
    $filePath = getRoomFilePath($joinCode);
    if (!file_exists($filePath)) {
        return null;
    }
    $content = file_get_contents($filePath);
    return json_decode($content, true);
}
function saveRoom($joinCode, $roomData) {
    $filePath = getRoomFilePath($joinCode);
    return file_put_contents($filePath, json_encode($roomData, JSON_PRETTY_PRINT));
}
function deleteRoom($joinCode) {
    $filePath = getRoomFilePath($joinCode);
    if (file_exists($filePath)) {
        return unlink($filePath);
    }
    return false;
}
function sendResponse($success, $data = [], $error = null) {
    $response = ['success' => $success];
    if ($success) {
        $response = array_merge($response, $data);
    } else {
        $response['error'] = $error;
    }
    echo json_encode($response);
    exit;
}
function validateJoinCode($code) {
    return preg_match('/^[A-Z0-9]{6}$/', $code);
}
try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || !isset($input['action'])) {
            sendResponse(false, [], 'Invalid request format');
        }
        $action = $input['action'];
        $joinCode = isset($input['joinCode']) ? strtoupper(trim($input['joinCode'])) : '';
        if (!validateJoinCode($joinCode)) {
            sendResponse(false, [], 'Invalid join code format');
        }
        switch ($action) {
            case 'create_room':
                if (!isset($input['sdp'])) {
                    sendResponse(false, [], 'SDP data required');
                }
                if (loadRoom($joinCode)) {
                    sendResponse(false, [], 'Room code already exists');
                }
                $roomData = [
                    'joinCode' => $joinCode,
                    'offer' => $input['sdp'],
                    'answer' => null,
                    'created_at' => time(),
                ];
                if (saveRoom($joinCode, $roomData)) {
                    sendResponse(true, ['joinCode' => $joinCode]);
                } else {
                    sendResponse(false, [], 'Failed to create room file');
                }
                break;
            case 'join_room':
                if (!isset($input['sdp'])) {
                    sendResponse(false, [], 'SDP data required');
                }
                $roomData = loadRoom($joinCode);
                if (!$roomData) {
                    sendResponse(false, [], 'Room not found');
                }
                if ($roomData['answer'] !== null) {
                    sendResponse(false, [], 'Room is full');
                }
                $roomData['answer'] = $input['sdp'];
                $roomData['joined_at'] = time();
                if (saveRoom($joinCode, $roomData)) {
                    sendResponse(true, ['joinCode' => $joinCode]);
                } else {
                    sendResponse(false, [], 'Failed to update room file');
                }
                break;
            case 'connection_established':
                $roomData = loadRoom($joinCode);
                if (!$roomData) {
                    sendResponse(false, [], 'Room not found');
                }
                if (deleteRoom($joinCode)) {
                    sendResponse(true, ['message' => 'Room cleaned up successfully']);
                } else {
                    sendResponse(false, [], 'Failed to delete room file');
                }
                break;
            default:
                sendResponse(false, [], 'Unknown action');
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $joinCode = isset($_GET['joinCode']) ? strtoupper(trim($_GET['joinCode'])) : '';
        if (!validateJoinCode($joinCode)) {
            sendResponse(false, [], 'Invalid join code format');
        }
        if (deleteRoom($joinCode)) {
            sendResponse(true, ['message' => 'Room deleted successfully']);
        } else {
            sendResponse(false, [], 'Room not found or failed to delete');
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = isset($_GET['action']) ? $_GET['action'] : '';
        $joinCode = isset($_GET['joinCode']) ? strtoupper(trim($_GET['joinCode'])) : '';
        if (!validateJoinCode($joinCode)) {
            sendResponse(false, [], 'Invalid join code format');
        }
        switch ($action) {
            case 'get_room':
                $roomData = loadRoom($joinCode);
                if (!$roomData) {
                    sendResponse(false, [], 'Room not found');
                }
                $response = [
                    'joinCode' => $joinCode,
                    'offer' => $roomData['offer'],
                    'hasAnswer' => ($roomData['answer'] !== null)
                ];
                if ($roomData['answer'] !== null) {
                    $response['answer'] = $roomData['answer'];
                }
                sendResponse(true, $response);
                break;
            case 'list_rooms':
                $rooms = [];
                $files = glob($roomsDir . '*.json');
                foreach ($files as $file) {
                    $roomData = json_decode(file_get_contents($file), true);
                    if ($roomData) {
                        $rooms[] = [
                            'code' => $roomData['joinCode'],
                            'hasOffer' => ($roomData['offer'] !== null),
                            'hasAnswer' => ($roomData['answer'] !== null),
                            'created' => date('Y-m-d H:i:s', $roomData['created_at']),
                            'file' => basename($file)
                        ];
                    }
                }
                sendResponse(true, ['rooms' => $rooms]);
                break;
            default:
                sendResponse(false, [], 'Unknown action');
        }
    } else {
        sendResponse(false, [], 'Method not allowed');
    }
} catch (Exception $e) {
    sendResponse(false, [], 'Server error: ' . $e->getMessage());
}
?>