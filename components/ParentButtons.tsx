"use client";
import { CopyButton } from "./CopyButton";
/** Sets a hidden "intent" field before the form submits, so one form can save, approve or un-approve. */
export function ParentButtons({ approved, text }: { approved: boolean; text: string }) {
  const set = (v: string) => (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget.form!.elements.namedItem("intent") as HTMLInputElement).value = v; };
  return (
    <div className="flex flex-wrap gap-2 mt-3 no-print">
      <input type="hidden" name="intent" defaultValue="save" />
      <button onClick={set("save")} className="btn btn-ghost">Save</button>
      {approved ? <button onClick={set("draft")} className="btn btn-ghost">Back to draft</button> : <button onClick={set("approve")} className="btn btn-primary">Approve</button>}
      <CopyButton text={text} label="Copy message" />
    </div>
  );
}
