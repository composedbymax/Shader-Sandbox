<?php
include '../../check_auth.php';
define('CACHE_DIR', __DIR__ . '/GsCache');
define('CACHE_GALLERIES_DIR', CACHE_DIR . '/galleries');
define('CACHE_SHADERS_DIR', CACHE_DIR . '/shaders');
define('CACHE_IMAGES_DIR', CACHE_DIR . '/images');
define('CACHE_ENABLED', true);
class CacheManager {
    private $galleriesDir;
    private $shadersDir;
    private $imagesDir;
    public function __construct() {
        $this->galleriesDir = CACHE_GALLERIES_DIR;
        $this->shadersDir = CACHE_SHADERS_DIR;
        $this->imagesDir = CACHE_IMAGES_DIR;
        $this->ensureDirectories();
    }
    private function ensureDirectories() {
        $dirs = [$this->galleriesDir, $this->shadersDir, $this->imagesDir];
        foreach ($dirs as $dir) {
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
        }
    }
    private function sanitizeFilename($name) {
        return preg_replace('/[^a-zA-Z0-9._-]/', '_', $name);
    }
    public function getGallery($page) {
        $file = $this->galleriesDir . '/page_' . $page . '.json';
        if (!file_exists($file)) {
            return null;
        }
        $cachedAt = filemtime($file);
        $data = json_decode(file_get_contents($file), true);
        return [
            'data' => $data,
            'cached_at' => $cachedAt
        ];
    }
    public function setGallery($page, $data) {
        $file = $this->galleriesDir . '/page_' . $page . '.json';
        file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT), LOCK_EX);
    }
    public function getShader($id) {
        $filename = $this->sanitizeFilename($id);
        $file = $this->shadersDir . '/' . $filename . '.json';
        if (!file_exists($file)) {
            return null;
        }
        $cachedAt = filemtime($file);
        $data = file_get_contents($file);
        return [
            'data' => $data,
            'cached_at' => $cachedAt
        ];
    }
    public function setShader($id, $data) {
        $filename = $this->sanitizeFilename($id);
        $file = $this->shadersDir . '/' . $filename . '.json';
        file_put_contents($file, $data, LOCK_EX);
    }
    public function getImage($path) {
        $filename = $this->sanitizeFilename(basename($path));
        $file = $this->imagesDir . '/' . $filename;
        if (!file_exists($file)) {
            return null;
        }
        $cachedAt = filemtime($file);
        $data = file_get_contents($file);
        return [
            'data' => $data,
            'cached_at' => $cachedAt
        ];
    }
    public function setImage($path, $imageData) {
        $filename = $this->sanitizeFilename(basename($path));
        $file = $this->imagesDir . '/' . $filename;
        file_put_contents($file, $imageData, LOCK_EX);
    }
}
$cacheManager = new CacheManager();
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
                    $cacheManager->setImage($thumbPath, $imageData);
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
            $response = json_decode($cached['data'], true);
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
            header('Content-Type: image/png');
            header('Content-Length: ' . strlen($cached['data']));
            header('Cache-Control: public, max-age=86400');
            header('X-Cache: HIT');
            echo $cached['data'];
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
        $cacheManager->setImage($path, $imageData);
    }
    header('Content-Type: image/png');
    header('Content-Length: ' . strlen($imageData));
    header('Cache-Control: public, max-age=86400');
    header('X-Cache: MISS');
    echo $imageData;
}
?>