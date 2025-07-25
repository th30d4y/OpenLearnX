"use client"

import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface CodeEditorProps {
  code: string
  onCodeChange: (code: string) => void
  language: string
  onLanguageChange: (lang: string) => void
  availableLanguages: string[]
  readOnly?: boolean
}

export function CodeEditor({
  code,
  onCodeChange,
  language,
  onLanguageChange,
  availableLanguages,
  readOnly = false,
}: CodeEditorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="code-editor" className="text-lg font-semibold">
          Code Editor
        </Label>
        <Select onValueChange={onLanguageChange} value={language} disabled={readOnly}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            {availableLanguages.map((lang) => (
              <SelectItem key={lang} value={lang}>
                {lang}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Textarea
        id="code-editor"
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
        className="font-mono text-sm h-96 bg-gray-900 text-white border-gray-700 focus:border-primary-blue focus:ring-primary-blue"
        placeholder="Write your code here..."
        readOnly={readOnly}
      />
    </div>
  )
}
