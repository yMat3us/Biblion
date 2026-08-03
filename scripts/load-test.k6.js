/* eslint-disable */
// Teste de carga com k6 (https://k6.io). NÃO faz parte do build/lint/testes.
//
// Uso:
//   k6 run -e BASE_URL=http://localhost:3000 -e USERNAME=teste -e PASSWORD=senha scripts/load-test.k6.js
//
// Sem USERNAME/PASSWORD, os endpoints autenticados respondem 401 (ainda mede
// latência do caminho de auth). NUNCA rode contra produção com dados reais —
// use um ambiente de teste. Os thresholds refletem o orçamento em
// docs/architecture/performance.md.
import http from 'k6/http'
import { check, sleep } from 'k6'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const USERNAME = __ENV.USERNAME || ''
const PASSWORD = __ENV.PASSWORD || ''

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 25 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'], // < 1% de falhas de transporte
    'http_req_duration{name:unread}': ['p(95)<150'],
    'http_req_duration{name:list}': ['p(95)<300'],
    'http_req_duration{name:bible}': ['p(95)<400'],
  },
}

// Autentica uma vez e compartilha o cookie de sessão entre os VUs.
export function setup() {
  if (!USERNAME || !PASSWORD) return { cookie: '' }
  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({ username: USERNAME, password: PASSWORD }), {
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL },
  })
  return { cookie: res.headers['Set-Cookie'] || '' }
}

export default function (data) {
  const headers = data.cookie ? { Cookie: data.cookie } : {}

  const unread = http.get(`${BASE_URL}/api/notificacoes?count=1`, { headers, tags: { name: 'unread' } })
  check(unread, { 'unread respondeu': (r) => r.status === 200 || r.status === 401 })

  const list = http.get(`${BASE_URL}/api/sermoes`, { headers, tags: { name: 'list' } })
  check(list, { 'list respondeu': (r) => r.status === 200 || r.status === 401 })

  const bible = http.get(`${BASE_URL}/api/bible/ACF/0/1`, { headers, tags: { name: 'bible' } })
  check(bible, { 'bible respondeu': (r) => r.status === 200 || r.status === 404 })

  sleep(1)
}
