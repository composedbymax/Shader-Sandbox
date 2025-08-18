<?php
include '../../check_auth.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}
$query = isset($_GET['q']) ? trim($_GET['q']) : '';
if (empty($query)) {
    echo json_encode(['success' => false, 'error' => 'Search query is required']);
    exit;
}

$snippetsFile = __DIR__ . '/find.json';
if (!file_exists($snippetsFile)) {
    echo json_encode(['success' => false, 'error' => 'Snippets database not found']);
    exit;
}
$snippetsData = file_get_contents($snippetsFile);
$snippets = json_decode($snippetsData, true);
if (!$snippets || !isset($snippets['snippets'])) {
    echo json_encode(['success' => false, 'error' => 'Invalid snippets database']);
    exit;
}
$results = searchSnippets($snippets['snippets'], $query);
echo json_encode([
    'success' => true,
    'results' => $results,
    'query' => $query,
    'total' => count($results)
]);
function searchSnippets(array $snippets, string $query): array {
    $results = [];
    $q = strtolower($query);
    foreach ($snippets as $snippet) {
        $score = 0;
        if (stripos($snippet['name'], $query) !== false) {
            $score += 10;
        }
        if (stripos($snippet['description'], $query) !== false) {
            $score += 5;
        }
        if (stripos($snippet['category'], $query) !== false) {
            $score += 6;
        }
        foreach ($snippet['tags'] as $tag) {
            if (stripos($tag, $query) !== false) {
                $score += 7;
            }
        }
        if (stripos($snippet['code'], $query) !== false) {
            $score += 2;
        }
        if ($score > 0) {
            $snippet['score'] = $score;
            $results[] = $snippet;
        }
    }
    usort($results, function($a, $b) {
        return $b['score'] <=> $a['score'];
    });
    $final = array_slice($results, 0, 20);
    foreach ($final as &$item) {
        unset($item['score']);
    }
    return $final;
}
?>