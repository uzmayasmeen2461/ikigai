export function Footer() {
    return (
        <footer className="border-t border-gray-200 mt-20 bg-white mb-10">
            <div className="max-w-[1440px] mx-auto px-6 py-6 flex justify-between items-center text-sm text-gray-500">
                <span>© {new Date().getFullYear()} IKIGAI</span>
                <span>
                    Designed by{" "}
                    <span className="font-semibold text-gray-800">UY</span>
                </span>
            </div>
        </footer>
    );
}