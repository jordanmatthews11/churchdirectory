import { SpreadsheetImporter } from '@/components/spreadsheet-importer'
import { SpreadsheetUpdater } from '@/components/spreadsheet-updater'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Import from Spreadsheet</h1>
        <p className="mt-1 text-sm text-slate-500">
          Bulk-import new families, or update the directory from an exported file.
        </p>
      </div>

      <Tabs defaultValue="new" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="new">New import</TabsTrigger>
          <TabsTrigger value="update">Update from export</TabsTrigger>
        </TabsList>
        <TabsContent value="new" className="mt-6">
          <SpreadsheetImporter />
        </TabsContent>
        <TabsContent value="update" className="mt-6">
          <SpreadsheetUpdater />
        </TabsContent>
      </Tabs>
    </div>
  )
}
