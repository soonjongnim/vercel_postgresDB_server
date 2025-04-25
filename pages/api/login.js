import { neon } from '@neondatabase/serverless';
import { setCorsHeaders } from '../../utils/cors'; // CORS 설정 함수 가져오기
import { serialize } from 'cookie'; // 쿠키 설정을 위한 라이브러리
import bcrypt from 'bcrypt'; // 비밀번호 해시 비교를 위한 라이브러리

const sql = neon(process.env.DATABASE_URL);

export default async function handler(request, response) {
  // CORS 헤더 설정
  setCorsHeaders(response);

  // OPTIONS 요청 처리
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { useremail, password } = request.body;

  try {
    // 이메일로 사용자 조회
    const users = await sql`
      SELECT * FROM users WHERE user_email = ${useremail}
    `;

    if (users.length === 0) {
      return response.status(404).json({ error: '해당 이메일이 존재하지 않습니다.' });
    }

    const user = users[0];
    console.log('password:', password);
    console.log('user.password:', user.password);
    // 비밀번호 확인
    // const isPasswordValid = await bcrypt.compare(password, user.password);
    // if (!isPasswordValid) {
    //   return response.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
    // }
    // 임시 비번테스트
    if (password !== user.password) {
      return response.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
    }

    // 세션에 사용자 정보 저장 (쿠키 설정)
    // const cookie = serialize('session', JSON.stringify({ id: user.id, name: user.name }), {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === 'production',
    //   sameSite: 'strict',
    //   path: '/',
    //   maxAge: 60 * 60 * 24, // 1일
    // });
    // response.setHeader('Set-Cookie', cookie);

    // // 세션에 사용자 정보 저장 (쿠키 설정)
    // request.session.user = { id: user.id, name: user.name, email: user.email };
    // await request.session.save();

    // 로그인 성공 - 사용자 정보 전달
    return response.status(200).json({
      message: '로그인 성공!',
      user: {
        id: user.id,
        username: user.user_name,
        useremail: user.user_email,
        userphone: user.phone,
      },
    });
  } catch (error) {
    console.error('Error during login:', error);
    return response.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
  }
}