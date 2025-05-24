<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

// Read the public.json file
$jsonFile = 'public.json';
if (!file_exists($jsonFile)) {
    echo json_encode(['error' => 'No shaders found']);
    exit;
}

$shaders = json_decode(file_get_contents($jsonFile), true);
if (!$shaders) {
    echo json_encode(['error' => 'Invalid shader data']);
    exit;
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'list':
        // Return only titles, previews, and users for the shader list
        $lightList = [];
        foreach ($shaders as $index => $shader) {
            $lightList[] = [
                'id' => $index,
                'title' => $shader['title'] ?? 'Untitled',
                'preview' => $shader['preview'] ?? '',
                'user' => $shader['user'] ?? 'Unknown'
            ];
        }
        echo json_encode($lightList);
        break;
        
    case 'load':
        // Return full shader data for a specific shader
        $id = intval($_GET['id'] ?? -1);
        if ($id >= 0 && $id < count($shaders)) {
            echo json_encode($shaders[$id]);
        } else {
            echo json_encode(['error' => 'Shader not found']);
        }
        break;
        
    default:
        echo json_encode(['error' => 'Invalid action. Use action=list or action=load&id=X']);
}
?>