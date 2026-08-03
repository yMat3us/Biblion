async function run() {
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: "yMat3us_", password: "85125514" })
  });
  if (!loginRes.ok) return console.error("Login failed");
  const cookies = loginRes.headers.get('set-cookie');
  
  const text = "A".repeat(45000);
  const res = await fetch('http://localhost:3000/api/ai/bible-chapter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookies },
    body: JSON.stringify({ chapterRef: "Salmos 119", chapterText: text })
  });
  
  console.log("Status:", res.status);
  if (!res.ok) console.log("Error:", await res.text());
}
run();
