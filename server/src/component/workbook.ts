import { randomUUID } from "node:crypto";
import ExcelJS from 'exceljs'
import {z} from 'zod'

export type Sheet = 'Indicators' | 'Milestones' | 'Risks and issues' | 'Expenditure' | 'Lessons'

export const columns: Record<Sheet, readonly string[]> = {
    Indicators: ['Indicator', 'Actual'],
    Milestones: ['Activity', 'Due date', 'Status', 'Completed date', 'Depends on', 'Notes'],
    'Risks and issues' : ['ID', 'Type', 'Description', 'Severity', 'Owner', 'Corrective action', 'Action due', 'Status'],
    Expenditure: ['Activity', 'Budget', 'Actual'],
    Lessons: ['ID', 'Lessons']

}

export const sheets = Object.keys(columns) as Sheet[]
export const status = ['Not started', 'In progress', 'Completed', 'Blocked'] as const

const sheetRows = 300
const valueLimit = 500
const date = z.iso.date()

export const numberValue = (value: string | undefined) => 
    value && /^-?\d+(?:\.\d{1,4})?$/.test(value) && Math.abs(Number(value)) <= 1e9
        ? Number(value)
        : null

export function recordKey(row: Row) {
    return row.values[columns[row.sheet][0]] ?? ''
}