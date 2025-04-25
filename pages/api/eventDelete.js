import { neon } from '@neondatabase/serverless';
import { setCorsHeaders } from '../../utils/cors'; // CORS 설정 함수 가져오기

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  // CORS 헤더 설정
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // Preflight 요청 처리
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Invalid request. No IDs provided.' });
  }

  try {
    // `files` 테이블에서 해당 이벤트 ID들의 데이터 삭제
    await sql`
      DELETE FROM files WHERE event_id = ANY(${ids})
    `;

    // `comments` 테이블에서 해당 이벤트 ID들의 데이터 삭제
    await sql`
      DELETE FROM comments WHERE event_id = ANY(${ids})
    `;

    // `events` 테이블에서 해당 이벤트 ID 삭제
    await sql`
      DELETE FROM events WHERE id = ANY(${ids})
    `;

    res.status(200).json({ message: 'Selected events and related files deleted successfully.' });
  } catch (error) {
    console.error('Error deleting events and files:', error);
    res.status(500).json({ error: 'Failed to delete events and files.' });
  }
}