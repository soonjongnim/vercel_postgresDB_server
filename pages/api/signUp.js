import { neon } from '@neondatabase/serverless';
import { setCorsHeaders } from '../../utils/cors'; // CORS 설정 함수 가져오기
import { handleOptionsRequest } from '../../utils/options'; // OPTIONS 처리 함수 가져오기
import { serialize } from 'cookie'; // 쿠키 설정을 위한 라이브러리

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

  const { username, useremail, phone, password } = request.body;

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

    // 데이터 삽입 후 삽입된 유저 정보 반환
    const newUser = await sql`
      INSERT INTO users (user_name, user_email, phone, password)
      VALUES (${username}, ${useremail}, ${phone}, ${password})
      RETURNING id, user_name, user_email, phone, created_at
    `;

    // newUser는 배열로 반환되므로 첫 번째 요소를 가져옵니다.
    const user = newUser[0];
    // 유저 정보 반환
    response.status(200).json({
      message: '회원가입된신것을 환영합니다.',
      user: {
        id: user.id,
        username: user.user_name,
        useremail: user.user_email,
        userphone: user.phone,
      },
    });
  } catch (error) {
    console.error('Error inserting user:', error);
    response.status(500).json({ error: '회원가입이 안되었습니다.' });
  }
}