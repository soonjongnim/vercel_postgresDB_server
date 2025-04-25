export function handleOptionsRequest(request, response) {
    if (request.method === 'OPTIONS') {
      response.status(200).end(); // Preflight 요청에 대해 200 응답 반환
      return true; // OPTIONS 요청 처리 완료
    }
    return false; // OPTIONS 요청이 아님
  }