import Link from "next/link";

export function Navbar() {
    return (
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
            <div className="max-w-[1440px] mx-auto px-6 py-4 flex justify-between items-center">

                <div>
                    <Link href="/" className="text-xl font-semibold tracking-wide text-gray-900">
                        IKIGAI
                    </Link>
                    <p className="text-xs text-gray-500">
                        Connecting Purpose with Productivity
                    </p>
                </div>

                <div className="flex gap-8 text-gray-600 text-sm font-medium">
                    <Link href="/business" className="hover:text-gray-900">
                        For Business
                    </Link>
                    <Link href="/workers" className="hover:text-gray-900">
                        For Workers
                    </Link>
                </div>
            </div>
        </nav>
    );
}