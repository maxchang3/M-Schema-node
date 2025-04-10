import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { SchemaEngine } from './schemaEngine'

// 1. Connect to the database
const dbName = 'aan_1'
const dbPath = path.join('M-Schema', `${dbName}.sqlite`)

// Check if the database file exists
if (!fs.existsSync(dbPath)) {
    console.error(`Database file not found: ${dbPath}`)
    process.exit(1)
}

const db = new Database(dbPath)

// 2. Construct M-Schema
const schemaEngine = new SchemaEngine(db, dbName)
const mschema = schemaEngine.mschema
const mschemaStr = mschema.toMSchema()
console.log(mschemaStr)

// Mkdir if it doesn't exist

fs.mkdirSync('dist', { recursive: true })

// Save M-Schema to a JSON file
const outputPath = path.join('dist', `${dbName}.json`)
console.log(outputPath)
mschema.save(outputPath)
console.log(`Saved M-Schema to ${outputPath}`)

// 3. Example template for Text-to-SQL
const dialect = 'sqlite'
const question = ''
const evidence = ''

const prompt = `You are now a ${dialect} data analyst, and you are given a database schema as follows:

【Schema】
${mschemaStr}

【Question】
${question}

【Evidence】
${evidence}

Please read and understand the database schema carefully, and generate an executable SQL based on the user's question and evidence. The generated SQL is protected by \`\`\`sql and \`\`\`.`

fs.writeFileSync('dist/prompt.txt', prompt, 'utf-8')

// Replace the function call_llm() with your own function or method to interact with a LLM API.
// response = call_llm(prompt)
