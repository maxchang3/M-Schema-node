> [!CAUTION]
> **WIP**
> 
> **DO NOT USE** this repository in production. It is under active development and may contain unstable or incomplete features.
>
> Currently, no test cases have been implemented to verify the equivalence of the original M-Schema implementation. Only  `aan_1.sqlite` has been tested.

# M-Schema Node.js Port

This repository is a Node.js implementation of [M-Schema](https://github.com/XGenerationLab/M-Schema), a semi-structured representation of database schemas.

For detailed information, please visit the [original repository](https://github.com/XGenerationLab/M-Schema).

## Usage

```bash
git clone --recursive https://github.com/maxchang3/M-Schema-node.git
cd M-Schema-node
pnpm install
```

### Execute Example

```bash
pnpm start
```

### Quick Start

Connect to the database

```ts
import Database from 'better-sqlite3'

const dbName = 'aan_1'
const db = new Database('./M-Schema/aan_1.sqlite')
```

Construct M-Schema

```ts
const schemaEngine = new SchemaEngine(db, dbName)
const mschema = schemaEngine.mschema
const mschemaStr = mschema.toMSchema()
// Save to file
mschema.save(f'./{db_name}.json')
```

Use for Text-to-SQL.

```ts
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
```

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.
