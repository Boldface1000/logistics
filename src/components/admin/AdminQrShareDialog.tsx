import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Share2, Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

const SHARE_URL = "https://easybluelogistics.com";

export function AdminQrShareDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "EasyBlue Logistics",
          text: "Install the EasyBlue app",
          url: SHARE_URL,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(SHARE_URL);
      toast.success("Link copied to clipboard");
    }
  };
  const copy = async () => {
    await navigator.clipboard.writeText(SHARE_URL);
    toast.success("Link copied");
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogTitle>Share EasyBlue</DialogTitle>
        <DialogDescription>
          Scan the QR to install the app, or share the link with anyone.
        </DialogDescription>
        <div className="flex justify-center p-4 bg-white rounded-2xl">
          <QRCodeSVG value={SHARE_URL} size={200} level="M" includeMargin />
        </div>
        <p className="text-center text-xs text-muted-foreground break-all">{SHARE_URL}</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={copy}
            className="h-11 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm flex items-center justify-center gap-2 active:scale-95"
          >
            <Copy className="h-4 w-4" /> Copy
          </button>
          <button
            onClick={share}
            className="h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 active:scale-95"
          >
            <Share2 className="h-4 w-4" /> Share
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
