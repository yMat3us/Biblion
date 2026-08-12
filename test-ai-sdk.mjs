import { createOpenAI } from '@ai-sdk/openai';

const provider = createOpenAI({
  apiKey: 'fake-key',
  baseURL: 'https://api.fake.com/v1',
});

console.log(typeof provider);
console.log(typeof provider.chat);
console.log(Object.keys(provider));
