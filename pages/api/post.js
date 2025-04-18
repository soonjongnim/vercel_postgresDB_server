import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

export default async function handler(request, response) {
  // CORS 헤더 추가
  response.setHeader('Access-Control-Allow-Origin', '*'); // 모든 도메인 허용
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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