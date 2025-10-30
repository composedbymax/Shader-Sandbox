<?php
include '../../check_auth.php';
define('CACHE_FILE', __DIR__ . '/api_cache.json');
define('CACHE_ENABLED', true);
class CacheManager {
    private $cacheFile;
    private $cache;
    public function __construct($file) {
        $this->cacheFile = $file;
        $this->loadCache();
    }
    private function loadCache() {
        if (file_exists($this->cacheFile)) {
            $json = file_get_contents($this->cacheFile);
            $this->cache = json_decode($json, true) ?? [];
        } else {
            $this->cache = [
                'galleries' => [],
                'shaders' => [],
                'images' => []
            ];
        }
    }
    private function saveCache() {
        $json = json_encode($this->cache, JSON_PRETTY_PRINT);
        file_put_contents($this->cacheFile, $json, LOCK_EX);
    }
    public function getGallery($page) {
        return $this->cache['galleries'][$page] ?? null;
    }
    public function setGallery($page, $data) {
        $this->cache['galleries'][$page] = [
            'data' => $data,
            'cached_at' => time()
        ];
        $this->saveCache();
    }
    public function getShader($id) {
        return $this->cache['shaders'][$id] ?? null;
    }
    public function setShader($id, $data) {
        $this->cache['shaders'][$id] = [
            'data' => $data,
            'cached_at' => time()
        ];
        $this->saveCache();
    }
    public function getImage($path) {
        return $this->cache['images'][$path] ?? null;
    }
    public function setImage($path, $base64Data) {
        $this->cache['images'][$path] = [
            'data' => $base64Data,
            'cached_at' => time()
        ];
        $this->saveCache();
    }
}
$cacheManager = new CacheManager(CACHE_FILE);
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
    if (CACHE_ENABLED) {
        $cached = $cacheManager->getGallery($page);
        if ($cached !== null) {
            $response = $cached['data'];
            $response['cached'] = true;
            $response['cached_at'] = date('Y-m-d H:i:s', $cached['cached_at']);
            echo json_encode($response);
            exit;
        }
    }
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
        $thumbPath = $match[2];
        if (CACHE_ENABLED) {
            $cachedImage = $cacheManager->getImage($thumbPath);
            if ($cachedImage === null) {
                $imageUrl = "https://glslsandbox.com{$thumbPath}";
                $context = stream_context_create([
                    'http' => [
                        'method' => 'GET',
                        'header' => "User-Agent: Mozilla/5.0\r\n"
                    ]
                ]);
                $imageData = @file_get_contents($imageUrl, false, $context);
                if ($imageData !== false) {
                    $base64 = base64_encode($imageData);
                    $cacheManager->setImage($thumbPath, $base64);
                }
            }
        }
        $shaders[] = [
            'id' => $match[1],
            'thumb' => $match[2]
        ];
    }
    $response = [
        'page' => $page,
        'shaders' => $shaders,
        'count' => count($shaders),
        'cached' => false
    ];
    if (CACHE_ENABLED) {
        $cacheManager->setGallery($page, $response);
    }
    echo json_encode($response);
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
    if (CACHE_ENABLED) {
        $cached = $cacheManager->getShader($id);
        if ($cached !== null) {
            $response = $cached['data'];
            if (!is_array($response)) {
                $response = json_decode($response, true);
            }
            if (is_array($response)) {
                $response['cached'] = true;
                $response['cached_at'] = date('Y-m-d H:i:s', $cached['cached_at']);
                $response['animationType'] = "webgl";
                echo json_encode($response);
            } else {
                echo json_encode(['error' => 'Invalid cached shader']);
            }
            exit;
        }
    }
    $url = "https://glslsandbox.com/item/{$id}";
    $json = @file_get_contents($url);
    if ($json === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch shader']);
        exit;
    }
    $data = json_decode($json, true);
    if ($data !== null) {
        $data['cached'] = false;
        $data['animationType'] = "webgl";
        $json = json_encode($data);
    }
    if (CACHE_ENABLED) {
        $cacheManager->setShader($id, $json);
    }
    echo $json;
} elseif ($type === 'image') {
    $path = $_GET['path'] ?? '';
    if (!preg_match('/^\/thumbs\/\d+\.png$/', $path)) {
        http_response_code(400);
        echo 'Invalid image path';
        exit;
    }
    if (CACHE_ENABLED) {
        $cached = $cacheManager->getImage($path);
        if ($cached !== null) {
            $imageData = base64_decode($cached['data']);
            header('Content-Type: image/png');
            header('Content-Length: ' . strlen($imageData));
            header('Cache-Control: public, max-age=86400');
            header('X-Cache: HIT');
            echo $imageData;
            exit;
        }
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
    if (CACHE_ENABLED) {
        $base64 = base64_encode($imageData);
        $cacheManager->setImage($path, $base64);
    }
    header('Content-Type: image/png');
    header('Content-Length: ' . strlen($imageData));
    header('Cache-Control: public, max-age=86400');
    header('X-Cache: MISS');
    echo $imageData;
}
?>