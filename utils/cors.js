export function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*'); // 모든 도메인 허용
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}