import { Link } from "wouter";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground p-4">
      <div className="p-8 rounded-2xl bg-card border border-border shadow-2xl max-w-md w-full text-center">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6 text-destructive">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="font-display text-2xl font-bold mb-2">Page Not Found</h1>
        <p className="text-muted-foreground mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link href="/" className="
          inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold text-sm
          bg-primary text-primary-foreground hover:bg-primary/90 
          transition-all duration-200 w-full
        ">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
