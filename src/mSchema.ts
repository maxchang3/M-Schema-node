import { examplesToStr, readJson, writeJson } from './utils'

interface FieldInfo {
    type: string
    primary_key: boolean
    nullable: boolean
    default: string | null
    autoincrement: boolean
    comment: string
    examples: string[]
}

interface TableInfo {
    fields: Record<string, FieldInfo>
    examples: string[]
    comment: string | null
}

export class MSchema {
    dbId: string
    schema: string | null
    tables: Record<string, TableInfo>
    foreignKeys: string[][]

    constructor(dbId = 'Anonymous', schema: string | null = null) {
        this.dbId = dbId
        this.schema = schema
        this.tables = {}
        this.foreignKeys = []
    }

    addTable(
        name: string,
        fields: Record<string, FieldInfo> = {},
        comment: string | null = null
    ): void {
        this.tables[name] = { fields: { ...fields }, examples: [], comment }
    }

    addField(
        tableName: string,
        fieldName: string,
        fieldType = '',
        primary_key = false,
        nullable = true,
        defaultValue: any = null,
        autoincrement = false,
        comment = '',
        examples: string[] = []
    ): void {
        this.tables[tableName].fields[fieldName] = {
            type: fieldType,
            primary_key,
            nullable: nullable,
            default: defaultValue === null ? null : `${defaultValue}`,
            autoincrement,
            comment,
            examples: [...examples],
        }
    }

    addForeignKey(
        tableName: string,
        fieldName: string,
        refSchema: string,
        refTableName: string,
        refFieldName: string
    ): void {
        this.foreignKeys.push([
            tableName,
            fieldName,
            refSchema,
            refTableName,
            refFieldName,
        ])
    }

    getFieldType(fieldType: string, simpleMode = true): string {
        if (!simpleMode) return fieldType
        return fieldType.split('(')[0]
    }

    hasTable(tableName: string): boolean {
        return Object.keys(this.tables).includes(tableName)
    }

    hasColumn(tableName: string, fieldName: string): boolean {
        if (this.hasTable(tableName)) {
            return Object.keys(this.tables[tableName].fields).includes(
                fieldName
            )
        }
        return false
    }

    getFieldInfo(
        tableName: string,
        fieldName: string
    ): FieldInfo | Record<string, any> {
        try {
            return this.tables[tableName].fields[fieldName]
        } catch {
            return {}
        }
    }

    singleTableMSchema(
        tableName: string,
        selectedColumns: string[] | null = null,
        exampleNum = 3,
        showTypeDetail = false
    ): string {
        const tableInfo = this.tables[tableName] || {}
        const output: string[] = []
        const tableComment = tableInfo.comment || ''

        if (
            tableComment !== null &&
            tableComment !== 'None' &&
            tableComment.length > 0
        ) {
            if (this.schema !== null && this.schema.length > 0) {
                output.push(
                    `# Table: ${this.schema}.${tableName}, ${tableComment}`
                )
            } else {
                output.push(`# Table: ${tableName}, ${tableComment}`)
            }
        } else {
            if (this.schema !== null && this.schema.length > 0) {
                output.push(`# Table: ${this.schema}.${tableName}`)
            } else {
                output.push(`# Table: ${tableName}`)
            }
        }

        const fieldLines: string[] = []

        // Process each field in the table
        for (const [fieldName, fieldInfo] of Object.entries(
            tableInfo.fields || {}
        )) {
            if (
                selectedColumns !== null &&
                !selectedColumns.includes(fieldName.toLowerCase())
            ) {
                continue
            }

            const rawType = this.getFieldType(fieldInfo.type, !showTypeDetail)
            let fieldLine = `(${fieldName}:${rawType.toUpperCase()}`

            if (fieldInfo.comment !== '') {
                fieldLine += `, ${fieldInfo.comment.trim()}`
            }

            // Add primary key identifier
            const isPrimaryKey = fieldInfo.primary_key
            if (isPrimaryKey) {
                fieldLine += `, Primary Key`
            }

            // Add examples if available
            if (fieldInfo.examples.length > 0 && exampleNum > 0) {
                let examples = fieldInfo.examples.filter((s) => s !== null)
                examples = examplesToStr(examples)

                if (examples.length > exampleNum) {
                    examples = examples.slice(0, exampleNum)
                }

                if (
                    ['DATE', 'TIME', 'DATETIME', 'TIMESTAMP'].includes(rawType)
                ) {
                    examples = examples.length > 0 ? [examples[0]] : []
                } else if (
                    examples.length > 0 &&
                    Math.max(...examples.map((s) => s.length)) > 20
                ) {
                    if (Math.max(...examples.map((s) => s.length)) > 50) {
                        examples = []
                    } else {
                        examples = examples.length > 0 ? [examples[0]] : []
                    }
                }

                if (examples.length > 0) {
                    const exampleStr = examples.join(', ')
                    fieldLine += `, Examples: [${exampleStr}]`
                }
            }

            fieldLine += ')'
            fieldLines.push(fieldLine)
        }

        output.push('[')
        output.push(fieldLines.join(',\n'))
        output.push(']')

        return output.join('\n')
    }

    toMSchema(
        selectedTables: string[] | null = null,
        selectedColumns: string[] | null = null,
        exampleNum = 3,
        showTypeDetail = false
    ): string {
        const output: string[] = []

        output.push(`【DB_ID】 ${this.dbId}`)
        output.push(`【Schema】`)

        let workingSelectedTables = selectedTables
        let workingSelectedColumns = selectedColumns

        if (selectedTables !== null) {
            workingSelectedTables = selectedTables.map((s) => s.toLowerCase())
        }
        if (selectedColumns !== null) {
            workingSelectedColumns = selectedColumns.map((s) => s.toLowerCase())
            workingSelectedTables = workingSelectedColumns.map((s) =>
                s.split('.')[0].toLowerCase()
            )
        }

        // Process each table
        for (const [tableName, tableInfo] of Object.entries(this.tables)) {
            if (
                workingSelectedTables === null ||
                workingSelectedTables.includes(tableName.toLowerCase())
            ) {
                const columnNames = Object.keys(tableInfo.fields)
                let curSelectedColumns: string[] | null = null

                if (workingSelectedColumns !== null) {
                    curSelectedColumns = columnNames
                        .filter((c) =>
                            workingSelectedColumns?.includes(
                                `${tableName}.${c}`.toLowerCase()
                            )
                        )
                        .map((c) => c.toLowerCase())
                } else {
                    curSelectedColumns = workingSelectedColumns
                }

                output.push(
                    this.singleTableMSchema(
                        tableName,
                        curSelectedColumns,
                        exampleNum,
                        showTypeDetail
                    )
                )
            }
        }

        // Add foreign key information
        if (this.foreignKeys.length > 0) {
            output.push('【Foreign keys】')
            for (const fk of this.foreignKeys) {
                const refSchema = fk[2]
                const [table1, column1, _, table2, column2] = fk

                if (
                    workingSelectedTables === null ||
                    (workingSelectedTables.includes(table1.toLowerCase()) &&
                        workingSelectedTables.includes(table2.toLowerCase()))
                ) {
                    if (refSchema === this.schema) {
                        output.push(`${fk[0]}.${fk[1]}=${fk[3]}.${fk[4]}`)
                    }
                }
            }
        }

        return output.join('\n')
    }

    dump() {
        return {
            db_id: this.dbId,
            schema: this.schema,
            tables: this.tables,
            foreign_keys: this.foreignKeys,
        }
    }

    save(filePath: string): void {
        const schemaDict = this.dump()
        writeJson(filePath, schemaDict)
    }

    load(filePath: string): void {
        const data = readJson(filePath)
        this.dbId = data.db_id || 'Anonymous'
        this.schema = data.schema || null
        this.tables = data.tables || {}
        this.foreignKeys = data.foreign_keys || []
    }
}
