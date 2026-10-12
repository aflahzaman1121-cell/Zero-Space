import { getFlash } from "@/lib/flash";
import { FlashView } from "./FlashView";
export async function Flash() {
  const f = await getFlash();
  return f ? <FlashView kind={f.kind} msg={f.msg} /> : null;
}
