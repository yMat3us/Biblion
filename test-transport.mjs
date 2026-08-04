import { DefaultChatTransport } from 'ai'
const transport = new DefaultChatTransport({ api: '/api/ai/tutor' })
console.log(transport)
