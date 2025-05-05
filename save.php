<?php
session_start();
include '../check_auth.php';
$json = json_decode(file_get_contents('php://input'), true);
if (!$json || !isset($json['title'], $json['vert'], $json['frag'], $json['preview'])) {
  http_response_code(400);
  echo "Invalid data.";
  exit;
}
$entry = [
  'title' => htmlspecialchars($json['title']),
  'vert' => json_decode($json['vert']),
  'frag' => json_decode($json['frag']),
  'preview' => $json['preview'],
  'user' => htmlspecialchars($_SESSION['user'])
];
$file = 'public.json';
$shaders = file_exists($file) ? json_decode(file_get_contents($file), true) : [];
$shaders[] = $entry;
file_put_contents($file, json_encode($shaders, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
echo "Shader saved!";
?>