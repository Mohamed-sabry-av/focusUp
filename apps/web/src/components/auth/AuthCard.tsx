import Link from "next/link";

interface AuthCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Centered card used by the small auth pages (forgot and reset password). */
export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fcf9f8] text-[#1c1b1b] font-sans px-4 py-10 animate-in fade-in duration-500">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-[#003076] flex items-center justify-center font-extrabold text-white">
          F
        </div>
        <span className="font-extrabold text-2xl tracking-tight text-[#003076]">
          FocusUP
        </span>
      </Link>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-[#1c1b1b]/5 p-8 md:p-10">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-2">
          {title}
        </h1>
        <p className="text-slate-500 text-sm font-medium mb-8">{description}</p>
        {children}
      </div>

      {footer && (
        <p className="mt-6 text-center text-sm font-medium text-slate-500">{footer}</p>
      )}
    </div>
  );
}
