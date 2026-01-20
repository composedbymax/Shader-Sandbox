<?php
include '../../check_auth.php';
header('Content-Type: application/json');
$configFile = __DIR__ . '/config.php';
if (!file_exists($configFile)) {
    echo json_encode(['error' => 'Configuration file not found']);
    exit;
}
$config = include $configFile;
$apiKey = $config['openrouter_api_key'] ?? null;
if (!$apiKey) {
    echo json_encode(['error' => 'API key not configured']);
    exit;
}
$action = $_GET['action'] ?? null;
if (!$action) {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? 'chat';
}
if ($action === 'models') {
    handleModels();
    exit;
}
if ($action === 'chat') {
    handleChat($apiKey);
    exit;
}
echo json_encode(['error' => 'Invalid action']);
function handleModels() {
    $apiUrl = 'https://openrouter.ai/api/frontend/models/find';
    $cacheFile = __DIR__ . '/models_cache.json';
    $cacheTtl = 48 * 60 * 60;
    $useCache = false;
    if (file_exists($cacheFile)) {
        $age = time() - filemtime($cacheFile);
        if ($age < $cacheTtl) $useCache = true;
    }
    $rawJson = null;
    if ($useCache) {
        $rawJson = file_get_contents($cacheFile);
    } else {
        $ch = curl_init($apiUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $resp = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($resp !== false && $httpCode === 200) {
            $rawJson = $resp;
            @file_put_contents($cacheFile, $rawJson, LOCK_EX);
        } elseif (file_exists($cacheFile)) {
            $rawJson = file_get_contents($cacheFile);
        } else {
            echo json_encode(['error' => 'Failed to fetch models', 'models' => []]);
            return;
        }
    }
    $decoded = json_decode($rawJson, true);
    $models = [];
    if (isset($decoded['data']['models']) && is_array($decoded['data']['models'])) {
        foreach ($decoded['data']['models'] as $m) {
            if (!modelIsFree($m)) continue;
            $modelName = getModelDisplayName($m);
            $modelId = getModelId($m);
            if ($modelId) {
                $models[] = [
                    'name' => $modelName,
                    'id' => $modelId
                ];
            }
        }
    }
    echo json_encode(['models' => $models]);
}
function handleChat($apiKey) {
    $input = json_decode(file_get_contents('php://input'), true);
    $userMessage = $input['message'] ?? '';
    $model = $input['model'] ?? null;
    if (!$userMessage) {
        echo json_encode(['error' => 'No message received']);
        exit;
    }
    if (!$model) {
        echo json_encode(['error' => 'No model selected']);
        exit;
    }
    $url = 'https://openrouter.ai/api/v1/chat/completions';
    $data = [
        'model' => $model,
        'messages' => [
            ['role' => 'user', 'content' => $userMessage]
        ]
    ];
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($data),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey
        ],
        CURLOPT_TIMEOUT => 60,
        CURLOPT_FAILONERROR => false,
    ]);
    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($result === false) {
        echo json_encode(['error' => 'Network error', 'retry' => true]);
        exit;
    }
    $response = json_decode($result, true);
    if (!$response) {
        echo json_encode(['error' => 'Invalid response from API', 'retry' => true]);
        exit;
    }
    if (isset($response['error'])) {
        $errorMsg = $response['error']['message'] ?? 'Unknown error';
        $errorCode = $response['error']['code'] ?? null;
        if ($errorCode === 429 || stripos($errorMsg, 'rate limit') !== false) {
            $rateInfo = checkRateLimit($apiKey);
            if ($rateInfo && isset($rateInfo['limit_remaining'])) {
                if ($rateInfo['limit_remaining'] <= 0) {
                    echo json_encode([
                        'error' => 'Rate limit reached. Please try again later.',
                        'rate_limited' => true,
                        'retry' => false
                    ]);
                    exit;
                }
            }
            echo json_encode(['error' => 'Temporary issue', 'retry' => true]);
            exit;
        }
        echo json_encode(['error' => $errorMsg, 'retry' => false]);
        exit;
    }
    $reply = $response['choices'][0]['message']['content'] ?? 'No response from model';
    echo json_encode(['reply' => $reply]);
}
function checkRateLimit($apiKey) {
    $url = 'https://openrouter.ai/api/v1/key';
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $apiKey
        ],
        CURLOPT_TIMEOUT => 5,
    ]);
    $res = curl_exec($ch);
    $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($res === false || $http !== 200) {
        return null;
    }
    $decoded = json_decode($res, true);
    return $decoded['data'] ?? $decoded;
}
function modelIsFree($m) {
    if (isset($m['is_free']) && $m['is_free'] === true) return true;
    if (isset($m['endpoint']['is_free']) && $m['endpoint']['is_free'] === true) return true;
    if (isset($m['variant']) && strtolower($m['variant']) === 'free') return true;
    if (isset($m['endpoint']['variant']) && strtolower($m['endpoint']['variant']) === 'free') return true;
    if (isset($m['free']) && $m['free'] === true) return true;
    if (!empty($m['provider_model_id']) && preg_match('/:free$/i', $m['provider_model_id'])) return true;
    return false;
}
function getModelDisplayName($m) {
    if (!empty($m['short_name'])) return $m['short_name'];
    if (!empty($m['name'])) return $m['name'];
    if (!empty($m['display_name'])) return $m['display_name'];
    if (!empty($m['endpoint']['model']['name'])) return $m['endpoint']['model']['name'];
    if (!empty($m['slug'])) return $m['slug'];
    return 'Unnamed model';
}
function getModelId($m) {
    if (!empty($m['endpoint']['model_variant_slug'])) {
        return $m['endpoint']['model_variant_slug'];
    }
    $slug = null;
    if (!empty($m['slug'])) {
        $slug = $m['slug'];
    } elseif (!empty($m['endpoint']['model']['slug'])) {
        $slug = $m['endpoint']['model']['slug'];
    }
    if ($slug) {
        if (!preg_match('/:free$/i', $slug)) {
            $slug .= ':free';
        }
        return $slug;
    }
    return null;
}