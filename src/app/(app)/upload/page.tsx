import { SubmitButton } from "@/components/submit-button";
import { uploadDocumentAction } from "./actions";

export default function UploadPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Upload document</h1>
        <p className="mt-1 text-sm text-slate-600">Upload PDF or image files into your Vault bucket.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <form action={uploadDocumentAction} className="space-y-4">
          <div>
            <label htmlFor="documentType" className="mb-1 block text-sm font-medium text-slate-700">
              Document type
            </label>
            <select id="documentType" name="documentType" defaultValue="general" className="w-full">
              <option value="general">General</option>
              <option value="transcript">Transcript</option>
              <option value="toefl">TOEFL</option>
              <option value="id">ID / Passport</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="file" className="mb-1 block text-sm font-medium text-slate-700">
              File
            </label>
            <input id="file" name="file" type="file" accept=".pdf,image/*" required className="w-full" />
          </div>

          <SubmitButton idleText="Upload to vault" loadingText="Uploading..." />
        </form>
      </section>
    </div>
  );
}
