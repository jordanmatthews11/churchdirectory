import { SpreadsheetImporter } from '@/components/spreadsheet-importer'

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Import from Spreadsheet</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload an Excel (.xlsx) or CSV file to bulk-import families and members.
        </p>
      </div>
      <SpreadsheetImporter />
    </div>
  )
}
