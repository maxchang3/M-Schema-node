import * as fs from 'node:fs'

export function writeJson(path: string, data: any): void {
    fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8')
}

export function readJson(path: string): any {
    const rawData = fs.readFileSync(path, 'utf-8')
    return JSON.parse(rawData)
}

export function saveJson(targetFile: string, js: any, indent = 4): void {
    fs.writeFileSync(targetFile, JSON.stringify(js, null, indent), 'utf-8')
}

export function isEmail(string: string): boolean {
    const pattern = /^[\w\.-]+@[\w\.-]+\.\w+$/
    const match = string.match(pattern)
    return !!match
}

export function examplesToStr(examples: any[]): string[] {
    let values: any[] = []
    let shouldBreak = false
    for (const element of examples) {
        if (shouldBreak) break

        let current = element

        if (current instanceof Date) {
            values = [current]
            shouldBreak = true
            break
        }

        if (typeof current === 'number') {
            current = current.toString()
        }

        if (typeof current === 'string' && isEmail(current)) {
            values = []
            shouldBreak = true
            break
        }

        if (
            typeof current === 'string' &&
            (current.includes('http://') || current.includes('https://'))
        ) {
            values = []
            shouldBreak = true
            break
        }

        if (current != null) {
            values.push(current)
        }
    }

    return values.map((v) => String(v)).filter((s) => s.length > 0)
}
