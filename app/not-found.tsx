import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#090d16] text-white">
      <h1 className="text-4xl font-bold mb-2">404 - Page Not Found</h1>
      <p className="text-slate-400 mb-6">The page you are looking for does not exist.</p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm transition"
      >
        Return to Home
      </Link>
    </div>
  );
}
