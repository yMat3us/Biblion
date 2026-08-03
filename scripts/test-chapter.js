async function run() {
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: "yMat3us_", password: "85125514" })
  });
  
  if (!loginRes.ok) return console.error("Login failed");
  const cookies = loginRes.headers.get('set-cookie');
  
  const res = await fetch('http://localhost:3000/api/ai/bible-chapter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookies },
    body: JSON.stringify({ chapterRef: "Gênesis 1", chapterText: "No princípio criou Deus os céus e a terra." })
  });
  
  console.log("Chapter API status:", res.status);
  if (!res.ok) console.log("Chapter API error:", await res.text());
}
run();
