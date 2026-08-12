import { db } from './lib/firebase'
async function main() {
  await db.collection('verseInsights').doc('joao-1-1').delete()
  console.log('Deleted')
}
main()
