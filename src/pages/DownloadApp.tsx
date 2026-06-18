import { Link } from "react-router-dom";
import { Download, Plus, Share2, ShieldCheck, Smartphone, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/BrandMark";

const apkUrl = "/downloads/neo-synapse-debug.apk";

function isIOSDevice() {
  if (typeof navigator === "undefined") return false;
  const platform = navigator.platform || "";
  const userAgent = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(userAgent) || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export default function DownloadApp() {
  const isIOS = isIOSDevice();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 p-4">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <BrandMark />
            <span className="truncate font-display text-lg font-bold">Neo Synapse</span>
          </Link>
          <Button variant="outline" size="sm" asChild>
            <Link to="/auth/sign-in">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-73px)] max-w-5xl items-center gap-8 p-4 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:p-6">
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            <Smartphone className="h-3.5 w-3.5" />
            Mobile app install
          </div>

          <div className="space-y-4">
            <h1 className="font-display text-4xl font-bold leading-tight text-foreground sm:text-5xl">
              Download the Neo Synapse mobile app
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Install Neo Synapse on Android, or add it to your iPhone Home Screen from Safari for quick mobile access.
            </p>
          </div>

          <section className={`rounded-2xl border p-4 ${isIOS ? "border-primary/25 bg-primary/5" : "border-border bg-card"}`}>
            <div className="flex items-start gap-3">
              <BrandMark className="mt-0.5 h-10 w-10" />
              <div className="min-w-0">
                <p className="font-display text-lg font-bold text-foreground">iOS: Add to Home Screen</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  On iPhone or iPad, open this page in Safari, tap Share, then choose Add to Home Screen.
                </p>
              </div>
            </div>
            <ol className="mt-4 grid gap-3 text-sm text-foreground sm:grid-cols-3">
              <li className="rounded-xl border border-border bg-background p-3">
                <Share2 className="mb-2 h-4 w-4 text-primary" />
                Tap the Safari Share button.
              </li>
              <li className="rounded-xl border border-border bg-background p-3">
                <Plus className="mb-2 h-4 w-4 text-primary" />
                Select Add to Home Screen.
              </li>
              <li className="rounded-xl border border-border bg-background p-3">
                <BrandMark className="mb-2 h-4 w-4" />
                Tap Add to install the shortcut.
              </li>
            </ol>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="h-12 rounded-xl text-base font-semibold" asChild>
              <a href={apkUrl} download>
                <Download className="h-5 w-5" />
                Download Android APK
              </a>
            </Button>
            <Button variant="outline" className="h-12 rounded-xl text-base font-semibold" asChild>
              <Link to="/auth/patient-sign-up">Create patient account</Link>
            </Button>
          </div>

          <div className="grid gap-3 pt-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-4">
              <ShieldCheck className="mb-3 h-5 w-5 text-primary" />
              <p className="font-medium">Secure patient access</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Use your existing Neo Synapse account after installing the app.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <Stethoscope className="mb-3 h-5 w-5 text-primary" />
              <p className="font-medium">Care features included</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Symptom checks, appointments, telemedicine, reports, and settings travel with you.
              </p>
            </div>
          </div>

          <p className="text-xs leading-5 text-muted-foreground">
            Android can install the APK directly. iOS uses Add to Home Screen until Apple App Store or TestFlight distribution is available.
            Review the{" "}
            <Link to="/privacy" className="font-medium text-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <section className="rounded-[2rem] border border-border bg-card p-4 shadow-food-card">
          <div className="overflow-hidden rounded-[1.5rem] border border-border bg-muted">
            <div className="flex items-center justify-between bg-secondary px-4 py-3 text-secondary-foreground">
              <span className="text-sm font-semibold">Neo Synapse</span>
              <span className="text-xs">Mobile</span>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex items-center gap-3">
                <BrandMark className="h-12 w-12" />
                <div>
                  <p className="font-display text-lg font-bold">Mobile install options</p>
                  <p className="text-sm text-muted-foreground">
                    Android APK and iOS Home Screen
                  </p>
                </div>
              </div>
              <div className="rounded-2xl bg-background p-4">
                <p className="text-sm font-medium">Android download path</p>
                <p className="mt-1 break-all text-xs text-muted-foreground">{apkUrl}</p>
              </div>
              <Button className="h-12 w-full rounded-xl font-semibold" asChild>
                <a href={apkUrl} download>
                  <Download className="h-4 w-4" />
                  Download APK
                </a>
              </Button>
              <div className="space-y-3 rounded-2xl bg-background p-4">
                <p className="text-sm font-medium">iOS Safari install steps</p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="flex gap-2"><Share2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Tap Share in Safari.</p>
                  <p className="flex gap-2"><Plus className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Choose Add to Home Screen.</p>
                  <p className="flex gap-2"><BrandMark className="mt-0.5 h-4 w-4" /> Confirm with Add.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
