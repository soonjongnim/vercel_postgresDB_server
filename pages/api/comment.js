import { neon } from '@neondatabase/serverless';
import { setCorsHeaders } from '../../utils/cors'; // CORS 설정 함수 가져오기

const sql = neon(process.env.DATABASE_URL);

export default async function handler(request, response) {
    // CORS 헤더 설정
    setCorsHeaders(response);

    if (request.method === 'OPTIONS') {
        return response.status(200).end(); // Preflight 요청 처리
    }

    if (request.method === "POST") {
        const { eventId, username, useremail, content } = request.body;

        if (!eventId || !username || !useremail || !content) {
            return response.status(400).json({ error: "모든 필드를 입력해주세요." });
        }

        try {
            // 댓글 테이블 생성 (존재하지 않을 경우)
            await sql`
        CREATE TABLE IF NOT EXISTS comments (
          id SERIAL PRIMARY KEY,
          event_id INT NOT NULL,
          user_name VARCHAR(50) NOT NULL,
          user_email VARCHAR(100) NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

            // 댓글 데이터 삽입
            const newComment = await sql`
        INSERT INTO comments (event_id, user_name, user_email, content)
        VALUES (${eventId}, ${username}, ${useremail}, ${content})
        RETURNING id, event_id, user_name, user_email, content, created_at
      `;

            response.status(201).json({ message: "댓글이 등록되었습니다.", comment: newComment });
        } catch (error) {
            console.error("Error inserting comment:", error);
            response.status(500).json({ error: "댓글 등록에 실패했습니다." });
        }
    } else if (request.method === 'GET') {
        const { eventId } = request.query;

        if (!eventId) {
            return response.status(400).json({ error: "eventId가 필요합니다." });
        }

        try {
            const comments = await sql`
        SELECT id, event_id, user_name, user_email, content, created_at
        FROM comments
        WHERE event_id = ${eventId}
        ORDER BY created_at DESC
      `;
            console.log("Fetched comments:", comments); // Fetch된 댓글 로그 출력
            response.status(200).json({ comments });
        } catch (error) {
            console.error("Error fetching comments:", error);
            response.status(500).json({ error: "댓글을 가져오는 데 실패했습니다." });
        }
    } else if (request.method === "PUT") {
        const { commentId, content } = request.body;

        if (!commentId || !content) {
            return response.status(400).json({ error: "commentId와 content가 필요합니다." });
        }

        try {
            await sql`
            UPDATE comments
            SET content = ${content}
            WHERE id = ${commentId}
          `;
            response.status(200).json({ message: "댓글이 수정되었습니다." });
        } catch (error) {
            console.error("Error updating comment:", error);
            response.status(500).json({ error: "댓글 수정에 실패했습니다." });
        }
    } else if (request.method === "DELETE") {
        const { commentId } = request.query;

        if (!commentId) {
            return response.status(400).json({ error: "commentId가 필요합니다." });
        }

        try {
            await sql`
            DELETE FROM comments
            WHERE id = ${commentId}
            `;
            response.status(200).json({ message: "댓글이 삭제되었습니다." });
        } catch (error) {
            console.error("Error deleting comment:", error);
            response.status(500).json({ error: "댓글 삭제에 실패했습니다." });
        }
    } else {
        response.status(405).json({ error: "Method not allowed" });
    }
}