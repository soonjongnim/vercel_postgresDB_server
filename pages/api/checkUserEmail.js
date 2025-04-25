import { neon } from '@neondatabase/serverless';
import { setCorsHeaders } from '../../utils/cors'; // CORS 설정 함수 가져오기
import { handleOptionsRequest } from '../../utils/options'; // OPTIONS 처리 함수 가져오기

const sql = neon(process.env.DATABASE_URL);

export default async function handler(request, response) {
  // CORS 헤더 설정
  setCorsHeaders(response);

  // OPTIONS 요청 처리
  if (handleOptionsRequest(request, response)) {
    return; // OPTIONS 요청이 처리되었으므로 종료
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { useremail } = request.body;

  if (!useremail) {
    return response.status(400).json({ error: '이메일을 입력해주세요.' });
  }

  try {
    // 테이블이 없으면 생성
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        user_name VARCHAR(50) NOT NULL,
        user_email VARCHAR(100) UNIQUE NOT NULL,
        phone VARCHAR(20),
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // 이메일 중복 체크
    const result = await sql`
      SELECT COUNT(*) AS count FROM users WHERE user_email = ${useremail}
    `;

    if (result[0].count > 0) {
      return response.status(200).json({ exists: true, message: '이미 사용 중인 이메일입니다.' });
    } else {
      return response.status(200).json({ exists: false, message: '사용 가능한 이메일입니다.' });
    }
  } catch (error) {
    console.error('Error checking user email:', error);
    return response.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}