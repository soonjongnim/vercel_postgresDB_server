import { neon } from '@neondatabase/serverless';
import { setCorsHeaders } from '../../utils/cors'; // CORS 설정 함수 가져오기

const sql = neon(process.env.DATABASE_URL);

export default async function handler(request, response) {
  // CORS 헤더 설정
  setCorsHeaders(response);

  if (request.method === 'OPTIONS') {
    return response.status(200).end(); // Preflight 요청 처리
  }

  try {
    const post = await sql`SELECT * FROM posts`;
    console.log(post);
    return response.status(200).json({ post: post });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return response.status(500).json({ error: 'Failed to fetch posts' });
  }
}