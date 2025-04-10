> [!CAUTION]
> **WIP**
> 
> **DO NOT USE** this repository in production. It is under active development and may contain unstable or incomplete features.
>
> Currently, no test cases have been implemented to verify the equivalence of the original M-Schema implementation. Only  `aan_1.sqlite` has been tested.

# M-Schema Node.js Port

This repository is a Node.js implementation of [M-Schema](https://github.com/XGenerationLab/M-Schema), a semi-structured representation of database schemas.

Please visit the [original repository](https://github.com/XGenerationLab/M-Schema) for detailed information.

## Design Notes

- Currently, this project is not intended to be a library, just like the original M-Schema implementation. You can copy the code and use it in your own projects.
- The original M-Schema implementation uses [LlamaIndex](https://github.com/run-llama/llama_index)’s `SQLDatabase`, which is a wrapper of [SQLAlchemy](https://github.com/sqlalchemy/sqlalchemy).
  - I use `better-sqlite3` for database interactions and replicate some of SQLAlchemy’s `inspect` functionality using basic SQL queries. For reference, I consulted the [SQLAlchemy SQLite dialect code](https://github.com/sqlalchemy/sqlalchemy/blob/main/lib/sqlalchemy/dialects/sqlite/base.py).
  - Due to there is no direct equivalent of SQLAlchemy, **current only SQLite is supported**.
- Some of the code was initially converted with the assistance of LLMs.

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

1. Connect to the database

```ts
import Database from 'better-sqlite3'

const dbName = 'aan_1'
const db = new Database('./M-Schema/aan_1.sqlite')
```

2. Construct M-Schema

```ts
const schemaEngine = new SchemaEngine(db, dbName)
const mschema = schemaEngine.mschema
const mschemaStr = mschema.toMSchema()
// Save to file
mschema.save(f'./{db_name}.json')
```

3. Use for Text-to-SQL

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
