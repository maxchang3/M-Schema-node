import fs from 'node:fs'

export function writeJson(path: string, data: any) {
    fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8')
}

export function readJson(path: string) {
    const rawData = fs.readFileSync(path, 'utf-8')
    return JSON.parse(rawData)
}

export function saveJson(targetFile: string, js: any, indent = 4) {
    fs.writeFileSync(targetFile, JSON.stringify(js, null, indent), 'utf-8')
}

export function isEmail(string: string) {
    const pattern = /^[\w\.-]+@[\w\.-]+\.\w+$/
    const match = string.match(pattern)
    return !!match
}

export function examplesToStr(examples: any[]): string[] {
    const values: any[] = []

    for (const element of examples) {
        if (element instanceof Date) {
            return [element.toISOString()]
        }

        if (typeof element === 'number') {
            values.push(element.toString())
            continue
        }

        if (typeof element === 'string') {
            if (
                isEmail(element) ||
                element.startsWith('http://') ||
                element.startsWith('https://')
            ) {
                return []
            }
            values.push(element)
            continue
        }

        if (element != null) {
            values.push(element)
        }
    }

    return values.map(String).filter((s) => s.trim().length > 0)
}
