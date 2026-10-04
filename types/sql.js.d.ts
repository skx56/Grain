declare module 'sql.js' {
  export interface QueryExecResult {
    columns: string[]
    values: (string | number | null | Uint8Array)[][]
  }

  export interface Database {
    run(sql: string): Database
    exec(sql: string): QueryExecResult[]
    close(): void
  }

  export interface SqlJsStatic {
    Database: new () => Database
  }

  export default function initSqlJs(config?: {
    locateFile?: (file: string) => string
  }): Promise<SqlJsStatic>
}
