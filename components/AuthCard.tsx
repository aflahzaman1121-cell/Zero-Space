import { Wordmark } from "./Wordmark";
export function AuthCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6"><Wordmark size={26} /></div>
        <div className="card cut p-6">
          <h1 className="text-2xl font-bold">{title}</h1>
          {sub ? <p className="text-slate mt-1 mb-5">{sub}</p> : <div className="mb-5" />}
          {children}
        </div>
        <p className="text-center text-xs text-slate mt-5">The Zero School · Start at zero.</p>
      </div>
    </div>
  );
}
