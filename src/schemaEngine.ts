import type Database from 'better-sqlite3'
import { MSchema } from './mSchema'
import { examplesToStr } from './utils'

type TableInfo = {
    name: string
    schema: string | null
    comment: string | null
}

type ColumnInfo = {
    name: string
    type: string
    notNull: boolean
    defaultValue: string | null
    primaryKey: boolean
}

type ForeignKeyInfo = {
    table: string
    from: string
    to: string
    toTable: string
    referred_schema: string | null
}

export class SchemaEngine {
    db: Database.Database
    mschema: MSchema
    usableTables: string[] = []
    tablesSchemas: Record<string, string> = {}
    dialect = 'sqlite'
    dbName: string

    constructor(
        db: Database.Database,
        dbName = 'Anonymous',
        schema: string | null = null
    ) {
        this.db = db
        this.dbName = dbName
        this.mschema = new MSchema(dbName, schema)
        this.initTables(schema)
        this.initMSchema()
    }

    initTables(schema: string | null): void {
        const tables = this.db
            .prepare(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            )
            .all() as TableInfo[]

        if (schema) {
            // If a schema is specified, filter tables by that schema
            this.usableTables = tables
                .map((t) => t.name)
                .filter((tableName) => this.hasTable(tableName, schema))

            // Store the specified schema for each table
            for (const tableName of this.usableTables) {
                this.tablesSchemas[tableName] = schema
            }
        } else {
            // If no schema is specified, collect tables from all available schemas
            const allTables: string[] = []

            // Iterate through all available schemas
            const schemas = this.getSchemaNames()
            for (const s of schemas) {
                const schemaTables = this.getTableNames(s)
                allTables.push(...schemaTables)

                // Store the schema for each table
                for (const table of schemaTables) {
                    this.tablesSchemas[table] = s
                }
            }

            this.usableTables =
                allTables.length > 0 ? allTables : tables.map((t) => t.name)

            // If no schemas were found or we couldn't get tables by schema,
            // use the default empty schema for all tables
            if (allTables.length === 0) {
                for (const tableName of this.usableTables) {
                    this.tablesSchemas[tableName] = ''
                }
            }
        }
    }
    hasTable(tableName: string, schema: string): boolean {
        if (!this.getSchemaNames().includes(schema)) return false
        // Query the database to check if the table exists
        try {
            const query = `SELECT name FROM sqlite_master WHERE type='table' AND name = ?`
            const result = this.db.prepare(query).get(tableName)
            return !!result
        } catch (error) {
            console.error(`Error checking table existence: ${error}`)
            return false
        }
    }

    // Retrieve all schema names in the SQLite database.
    // Note: SQLite does not support multiple schemas in the same way as databases like PostgreSQL.
    // However, it does allow attaching multiple databases, which can act as separate schemas.
    // This implementation references the approach used in SQLAlchemy's SQLite dialect:
    // https://github.com/sqlalchemy/sqlalchemy/blob/main/lib/sqlalchemy/dialects/sqlite/base.py#L2191
    getSchemaNames(): string[] {
        const databaseList = this.db.prepare('PRAGMA database_list').all() as {
            seq: number
            name: string
            file: string
        }[]
        const schemas = databaseList.map((db) => db.name)
        return schemas.filter((schema) => schema !== 'temp')
    }

    // Get table names for a specific schema
    getTableNames(schema: string, includeInternal = false): string[] {
        // For SQLite, schema is ignored as it has only one schema
        // Build the query based on whether to include internal tables
        const query = includeInternal
            ? "SELECT name FROM sqlite_master WHERE type='table'"
            : "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        return this.db
            .prepare(query)
            .all()
            .map((t: any) => t.name)
    }

    getTableComment(tableName: string): string {
        // SQLite doesn't support table comments natively
        return ''
    }

    getColumns(tableName: string): ColumnInfo[] {
        const res = this.db
            .prepare(`PRAGMA table_info("${tableName}")`)
            .all() as {
            name: string
            type: string
            notnull: number
            dflt_value: string | null
            pk: number
        }[]
        const columns: ColumnInfo[] = []
        for (const col of res) {
            const column: ColumnInfo = {
                name: col.name,
                type: col.type.toUpperCase(),
                notNull: Boolean(col.notnull),
                defaultValue: col.dflt_value,
                primaryKey: Boolean(col.pk),
            }
            columns.push(column)
        }
        return columns
    }

    getPrimaryKeys(tableName: string): string[] {
        const columns = this.db
            .prepare(`PRAGMA table_info("${tableName}")`)
            .all() as { pk: number; name: string }[]
        return columns.filter((col) => Boolean(col.pk)).map((col) => col.name)
    }

    getForeignKeys(tableName: string): ForeignKeyInfo[] {
        const foreignKeys = this.db
            .prepare(`PRAGMA foreign_key_list("${tableName}")`)
            .all() as {
            id: number
            seq: number
            table: string
            from: string
            to: string
            on_update: string
            on_delete: string
            match: string
        }[]

        return foreignKeys.map((fk) => ({
            table: tableName,
            from: fk.from,
            to: fk.to,
            toTable: fk.table,
            referred_schema: this.tablesSchemas[fk.table],
        }))
    }

    fetchDistinctValues(
        tableName: string,
        columnName: string,
        maxNum = 5
    ): any[] {
        try {
            const query = `SELECT DISTINCT "${columnName}" FROM "${tableName}" LIMIT ${maxNum}`
            const results = this.db.prepare(query).all() as {
                [columnName: string]: any
            }[]
            return results
                .map((r) => r[columnName])
                .filter((value) => value !== null && value !== '')
        } catch (error) {
            console.error(`Error fetching distinct values: ${error}`)
            return []
        }
    }

    initMSchema(): void {
        for (const tableName of this.usableTables) {
            const tableComment = this.getTableComment(tableName)
            const schema = this.tablesSchemas[tableName] || ''
            const tableWithSchema = schema
                ? `${schema}.${tableName}`
                : tableName

            this.mschema.addTable(tableWithSchema, {}, tableComment)

            // Add foreign keys
            const foreignKeys = this.getForeignKeys(tableName)
            for (const fk of foreignKeys) {
                const referredSchema = fk.referred_schema
                this.mschema.addForeignKey(
                    tableWithSchema,
                    fk.from,
                    referredSchema ?? '',
                    fk.toTable,
                    fk.to
                )
            }

            // Add columns
            const columns = this.getColumns(tableName)
            for (const column of columns) {
                const examples = this.fetchDistinctValues(
                    tableName,
                    column.name,
                    5
                )

                console.log(examples)

                const stringExamples = examplesToStr(examples)

                // Check if column is auto-incrementing
                const isInteger = column.type === 'INTEGER'
                const isAutoIncrement =
                    column.primaryKey &&
                    isInteger &&
                    (
                        this.db
                            .prepare(
                                `SELECT sql FROM sqlite_master WHERE name = ?`
                            )
                            .get(tableName) as { sql?: string }
                    )?.sql?.includes('AUTOINCREMENT')

                this.mschema.addField(
                    tableWithSchema,
                    column.name,
                    column.type,
                    column.primaryKey,
                    !column.notNull, // nullable is opposite of notNull
                    column.defaultValue,
                    isAutoIncrement,
                    tableComment,
                    stringExamples
                )
            }
        }
    }
}
