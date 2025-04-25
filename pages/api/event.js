import { neon } from '@neondatabase/serverless';
import { setCorsHeaders } from '../../utils/cors'; // CORS 설정 함수 가져오기
// import fs from 'fs'; // Node.js 파일 시스템 모듈 가져오기

const sql = neon(process.env.DATABASE_URL);

export const config = {
    api: {
        bodyParser: false, // FormData를 처리하기 위해 bodyParser 비활성화
    },
};

export default async function handler(request, response) {
    // CORS 헤더 설정
    setCorsHeaders(response);

    if (request.method === 'OPTIONS') {
        return response.status(200).end(); // Preflight 요청 처리
    }

    if (request.method === 'POST') {
        try {
            // 테이블이 없으면 생성
            await sql`
                CREATE TABLE IF NOT EXISTS events (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR(255), -- 제목 필드 추가
                    details TEXT,
                    file_path VARCHAR(255),
                    paths JSON,
                    menus JSON,
                    user_email VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;

            // `files` 테이블이 없으면 생성
            await sql`
                CREATE TABLE IF NOT EXISTS files (
                id SERIAL PRIMARY KEY,
                event_id INT NOT NULL,
                file_index INT NOT NULL,
                filename VARCHAR(255) NOT NULL,
                fileblob BYTEA NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;

            // FormData 처리
            const { Formidable } = await import('formidable');
            const form = new Formidable({ multiples: true, keepExtensions: true });

            form.parse(request, async (err, fields, files) => {
                if (err) {
                    console.error('Error parsing form data:', err);
                    response.status(500).json({ error: 'Failed to parse form data' });
                    return; // 응답을 보낸 후 함수 종료
                }
                // console.log('fields:', fields); // 디버깅용 로그
                // const contact = fields.contact ? fields.contact[0] : null;
                // const name = fields.name ? fields.name[0] : null;
                const title = fields.title ? fields.title[0] : null; // 제목 필드 추가
                const details = fields.details ? fields.details[0] : null;
                const userEmail = fields.userEmail ? fields.userEmail[0] : null;
                let paths = [];
                let menus = [];
                const originalFilename = files.file ? files.file[0].originalFilename : null;
                console.log('originalFilename:', originalFilename); // 디버깅용 로그
                // paths와 menus를 JSON으로 파싱
                try {
                    paths = JSON.parse(fields.paths);
                    menus = JSON.parse(fields.menus);
                } catch (parseError) {
                    console.error('Error parsing paths or menus:', parseError);
                    response.status(400).json({ error: 'Invalid paths or menus format' });
                    return;
                }

                // console.log('contact:', contact); // 디버깅용 로그
                // console.log('name:', name); // 디버깅용 로그
                console.log('details:', details); // 디버깅용 로그
                console.log('paths:', paths); // 디버깅용 로그
                console.log('menus:', menus); // 디버깅용 로그
                console.log('userEmail:', userEmail); // 디버깅용 로그

                // 이벤트 데이터 삽입
                let eventId;
                try {
                    const eventResult = await sql`
      INSERT INTO events (title, details, paths, menus, user_email)
      VALUES (${title}, ${details}, ${JSON.stringify(paths)}, ${JSON.stringify(menus)}, ${userEmail})
      RETURNING *
    `;
                    eventId = eventResult[0].id;
                } catch (error) {
                    console.error('Error saving event:', error);
                    response.status(500).json({ error: 'Failed to save event' });
                    return;
                }



                // 파일 데이터 처리
                const fileArray = Object.keys(files).map((key) => files[key]);
                for (let i = 0; i < fileArray.length; i++) {
                    const file = fileArray[i];
                    console.log('file:', file); // 디버깅용 로그
                    const fileIndex = i + 1; // 파일 순번
                    const filename = file[0].newFilename; // 파일명
                    const fileBlob = await fs.promises.readFile(file[0].filepath); // 파일 Blob
                    console.log('fileBlob:', fileBlob); // 디버깅용 로그
                    console.log('fileIndex:', fileIndex); // 디버깅용 로그
                    console.log('filename:', filename); // 디버깅용 로그

                    try {
                        await sql`
                            INSERT INTO files (event_id, file_index, filename, fileblob)
                            VALUES (${eventId}, ${fileIndex}, ${filename}, ${fileBlob})
                            `;
                    } catch (error) {
                        console.error('Error saving file:', error);
                        response.status(500).json({ error: 'Failed to save file' });
                        return;
                    }
                }

                response.status(201).json({ message: 'Event and files saved successfully' });
            });
        } catch (error) {
            console.error('Error handling POST request:', error);
            response.status(500).json({ error: 'Failed to handle POST request' });
        }
    } else if (request.method === 'GET') {
        try {
            const { page = 1, itemsPerPage = 10, search = "", useremail } = request.query; // 검색어, 페이지, 페이지당 항목 수 가져오기

            const offset = (page - 1) * itemsPerPage; // 시작 위치 계산
            const limit = parseInt(itemsPerPage, 10); // 페이지당 항목 수

            let eventsWithFiles;

            if (search) {
                // 검색어가 있는 경우
                eventsWithFiles = await sql`
                  SELECT 
                    e.id AS event_id,
                    e.title,
                    e.details,
                    e.paths,
                    e.menus,
                    e.user_email,
                    u.user_name, -- 글쓴이 이름 추가
                    u.phone, -- 글쓴이 전화번호 추가
                    e.created_at,
                    f.file_index,
                    f.filename,
                    f.fileblob
                  FROM events e
                  LEFT JOIN users u ON e.user_email = u.user_email -- users 테이블과 조인
                  LEFT JOIN files f ON e.id = f.event_id
                  WHERE e.title ILIKE ${'%' + search + '%'} -- 제목에서 검색
                  ${useremail !== 'admin' ? sql`AND e.user_email = ${useremail}` : sql``}
                  ORDER BY e.created_at DESC
                  LIMIT ${limit} OFFSET ${offset} -- 페이징 처리
                `;
            } else {
                // 검색어가 없는 경우
                eventsWithFiles = await sql`
                  SELECT 
                    e.id AS event_id,
                    e.title,
                    e.details,
                    e.paths,
                    e.menus,
                    e.user_email,
                    u.user_name, -- 글쓴이 이름 추가
                    u.phone, -- 글쓴이 전화번호 추가
                    e.created_at,
                    f.file_index,
                    f.filename,
                    f.fileblob
                  FROM events e
                  LEFT JOIN users u ON e.user_email = u.user_email -- users 테이블과 조인
                  LEFT JOIN files f ON e.id = f.event_id
                  ${useremail !== 'admin' ? sql`WHERE e.user_email = ${useremail}` : sql``}
                  ORDER BY e.created_at DESC
                  LIMIT ${limit} OFFSET ${offset} -- 페이징 처리
                `;
            }

            // 전체 데이터 개수 가져오기
            const totalCountResult = await sql`
            SELECT COUNT(*) AS total_count
            FROM events
            ${useremail === 'admin' ? sql`` : sql`WHERE user_email = ${useremail}`} -- admin일 경우 WHERE 절 없음
            ${search ? (useremail === 'admin' ? sql`WHERE title ILIKE ${'%' + search + '%'}` : sql`AND title ILIKE ${'%' + search + '%'}`) : sql``} -- 조건에 따라 WHERE 또는 AND 사용
            `;
            const totalCount = totalCountResult[0].total_count;
            // console.log('totalCount:', totalCount); // 디버깅용 로그
            // 데이터를 그룹화하여 이벤트별 파일 데이터를 포함
            const groupedEvents = eventsWithFiles.reduce((acc, row) => {
                const eventId = row.event_id;

                if (!acc[eventId]) {
                    acc[eventId] = {
                        id: row.event_id,
                        title: row.title,
                        details: row.details,
                        paths: row.paths,
                        menus: row.menus,
                        useremail: row.user_email,
                        username: row.user_name, // 글쓴이 이름 추가
                        userphone: row.phone, // 글쓴이 전화번호 추가
                        created_at: row.created_at,
                        files: [],
                    };
                }

                if (row.file_index !== null) {
                    acc[eventId].files.push({
                        file_index: row.file_index,
                        filename: row.filename,
                        fileblob: row.fileblob,
                    });
                }

                return acc;
            }, {});

            // 객체를 배열로 변환
            const events = Object.values(groupedEvents);

            response.status(200).json({
                events,
                totalCount, // 전체 데이터 개수
                totalPages: Math.ceil(totalCount / itemsPerPage), // 전체 페이지 수
                currentPage: parseInt(page, 10), // 현재 페이지
            });
        } catch (error) {
            console.error('Error fetching events with files:', error);
            response.status(500).json({ error: 'Failed to fetch events with files' });
        }
    } else {
        response.status(405).json({ error: 'Method not allowed' });
    }
}