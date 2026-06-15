import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Download, Share2, Printer, X } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import type { OrderRecord } from "@/lib/orders-store";

interface Props {
  order: OrderRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userType?: string;
}

export function ReceiptModal({ order, open, onOpenChange, userType }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  if (!order) return null;

  const d = new Date(order.createdAt);
  const date = d.toLocaleDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const amount = order.priceCents != null ? `$${(order.priceCents / 100).toFixed(2)}` : "—";

  const lines: Array<[string, string]> = [
    ["Receipt No.", order.id],
    ["Date", date],
    ["Time", time],
    ["Order Type", order.type.toUpperCase()],
    ["Status", order.status.replace("_", " ").toUpperCase()],

    ["Customer", `${order.customerFirstName} ${order.customerLastName}`],
    ["Phone", order.customerPhone || "—"],
    ["Email", order.customerEmail],
    ["User Type", (userType ?? "customer").toUpperCase()],
    ["Rider", order.assignedRiderName ?? "Unassigned"],

    ["Sender Name", order.senderName],
    ["Sender Location", order.senderLocation],
    ["Sender Phone", order.senderPhone],

    ["Receiver Name", order.receiverName],
    ["Receiver Location", order.receiverLocation],
    ["Receiver Phone", order.receiverPhone],

    ["Payment Mode", order.paymentMode.toUpperCase()],

    ["Item", order.itemDescription],
    ["Amount", amount],
  ];

  const buildPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a5" });
    doc.setFont("courier", "normal");
    const w = doc.internal.pageSize.getWidth();
    let y = 48;
    doc.setFontSize(16);
    doc.setFont("courier", "bold");
    doc.text("EASYBLUE", w / 2, y, { align: "center" });
    y += 18;
    doc.setFontSize(10);
    doc.setFont("courier", "normal");
    doc.text("OFFICIAL RECEIPT", w / 2, y, { align: "center" });
    y += 14;
    doc.text("================================", w / 2, y, { align: "center" });
    y += 18;
    doc.setFontSize(10);
    for (const [k, v] of lines) {
      const wrapped = doc.splitTextToSize(`${k.padEnd(12, " ")}: ${v}`, w - 64);
      doc.text(wrapped, 32, y);
      y += wrapped.length * 13;
    }
    y += 8;
    doc.text("================================", w / 2, y, { align: "center" });
    y += 16;
    doc.text("Thank you for choosing EasyBlue.", w / 2, y, { align: "center" });
    return doc;
  };

  const handleDownload = () => {
    try {
      setBusy(true);
      const doc = buildPdf();
      doc.save(`easyblue-receipt-${order.id}.pdf`);
      toast.success("Receipt downloaded");
    } catch {
      toast.error("Failed to download receipt");
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    try {
      setBusy(true);
      const doc = buildPdf();
      const blob = doc.output("blob");
      const file = new File([blob], `easyblue-receipt-${order.id}.pdf`, {
        type: "application/pdf",
      });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await nav.share({
          files: [file],
          title: `EasyBlue Receipt ${order.id}`,
          text: `Receipt for ${order.id}`,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `easyblue-receipt-${order.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast("Sharing unavailable — downloaded instead");
      }
    } catch {
      toast.error("Failed to share receipt");
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = () => {
    const html = ref.current?.innerHTML ?? "";
    const w = window.open("", "_blank", "width=480,height=720");
    if (!w) return toast.error("Pop-up blocked");
    w.document.write(`<!doctype html><html><head><title>Receipt ${order.id}</title>
      <style>
        body{font-family:'Courier New',ui-monospace,monospace;background:#fff;color:#000;padding:24px;}
        .row{display:flex;gap:8px;border-bottom:1px dashed #999;padding:4px 0;font-size:12px;}
        .k{font-weight:700;min-width:96px;text-transform:uppercase;}
        h1{text-align:center;letter-spacing:.2em;margin:0 0 4px;}
        .sub{text-align:center;font-size:11px;margin-bottom:12px;}
        .sep{text-align:center;letter-spacing:.1em;margin:8px 0;}
      </style></head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
      w.close();
    }, 250);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 gap-0 bg-[#fdfaf3] text-black border-2 border-dashed border-black/40 [&>button]:hidden">
        <DialogTitle className="sr-only">Receipt {order.id}</DialogTitle>

        <div className="flex items-center justify-between px-4 py-2 bg-black text-white">
          <span className="font-mono text-xs tracking-widest">RECEIPT</span>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrint}
              aria-label="Print"
              disabled={busy}
              className="h-8 w-8 rounded hover:bg-white/15 flex items-center justify-center"
            >
              <Printer className="h-4 w-4" />
            </button>
            <button
              onClick={handleDownload}
              aria-label="Download PDF"
              disabled={busy}
              className="h-8 w-8 rounded hover:bg-white/15 flex items-center justify-center"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={handleShare}
              aria-label="Share"
              disabled={busy}
              className="h-8 w-8 rounded hover:bg-white/15 flex items-center justify-center"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="h-8 w-8 rounded hover:bg-white/15 flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          ref={ref}
          className="px-5 py-5 font-mono text-[12px] leading-relaxed max-h-[70vh] overflow-y-auto"
          style={{ fontFamily: "'Courier New', ui-monospace, monospace" }}
        >
          <h1 className="text-center text-xl font-bold tracking-[0.25em] m-0">EASYBLUE</h1>
          <p className="sub text-center text-[11px] mt-1 mb-3">OFFICIAL RECEIPT</p>
          <p className="sep text-center my-2">────────────────────────</p>
          <div className="flex flex-col">
            {lines.map(([k, v]) => (
              <div key={k} className="row flex gap-2 border-b border-dashed border-black/30 py-1">
                <span className="k font-bold uppercase min-w-[96px]">{k}</span>
                <span className="flex-1 break-words">{v}</span>
              </div>
            ))}
          </div>
          <p className="sep text-center my-3">────────────────────────</p>
          <p className="text-center text-[11px]">Thank you for choosing EasyBlue.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
