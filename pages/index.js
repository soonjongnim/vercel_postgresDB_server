import Head from 'next/head'
import Image from 'next/image'
import { Inter } from 'next/font/google'
import styles from '@/styles/Home.module.css'

const inter = Inter({ subsets: ['latin'] })

export default function Home({ posts }) {
  return (
    <>
      <Head>
        <title>Post List</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={`${styles.main} ${inter.className}`}>
        <h1>Post List</h1>
        <div className={styles.grid}>
          {posts.length > 0 ? (
            posts.map((post) => (
              <div key={post.id} className={styles.card}>
                <h2>{post.title}</h2>
                <p>{post.content}</p>
                <small>Author: {post.author}</small>
              </div>
            ))
          ) : (
            <p>No posts available</p>
          )}
        </div>
      </main>
    </>
  );
}

// 서버에서 데이터를 가져오는 함수
export async function getServerSideProps() {
  const res = await fetch('/api/post'); // API 호출
  const data = await res.json();
  console.log("Fetched data from API:", data); // API 응답 확인
  return {
    props: {
      posts: data.post || [], // 데이터를 props로 전달
    },
  };
}
