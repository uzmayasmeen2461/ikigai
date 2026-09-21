import {
    AlertTriangle,
    ArrowRight,
    BarChart3,
    CalendarDays,
    Camera,
    CheckCircle2,
    ClipboardList,
    FileSpreadsheet,
    Film,
    MessageCircle,
    PackageCheck,
    RefreshCw,
    ShoppingBag,
    Sparkles,
} from "lucide-react";

const platformServices = [
    {
        title: "Product inventory setup",
        desc: "Upload a CSV, add products manually, or start from product photos with prices.",
        icon: FileSpreadsheet,
        visual: "inventory",
    },
    {
        title: "Catalog preview",
        desc: "See how customers will view products on mobile before anything goes live.",
        icon: PackageCheck,
        visual: "preview",
    },
    {
        title: "Facebook and Instagram posts",
        desc: "Review product copy and images, then publish to connected business accounts.",
        icon: Camera,
        visual: "publish",
    },
    {
        title: "WhatsApp catalog support",
        desc: "Prepare catalog-ready product information and request manual setup support where needed.",
        icon: MessageCircle,
        visual: "whatsapp",
    },
    {
        title: "Social content assistant",
        desc: "Create captions, offers, hashtags, and product copy from your inventory.",
        icon: Sparkles,
        visual: "content",
    },
    {
        title: "Reel Studio",
        desc: "Turn product images or uploaded videos into short reel-ready content.",
        icon: Film,
        visual: "reel",
    },
    {
        title: "Growth calendar",
        desc: "Plan weekly product posts and reminders so marketing stays consistent.",
        icon: CalendarDays,
        visual: "calendar",
    },
    {
        title: "Stock update tracking",
        desc: "When price or stock changes, ORVA tracks what needs to be updated across channels.",
        icon: RefreshCw,
        visual: "stock",
    },
    {
        title: "Simple billing",
        desc: "Create basic bills from products and share them with customers.",
        icon: ShoppingBag,
        visual: "billing",
    },
    {
        title: "Inventory intelligence",
        desc: "Spot low-stock products, promotion ideas, and catalog items that need attention.",
        icon: BarChart3,
        visual: "intelligence",
    },
];

function ServiceVisual({ item }) {
    const Icon = item.icon;
    const products = [
        { name: "Shoe", price: "1499", color: "bg-[#dbeafe]" },
        { name: "Bag", price: "899", color: "bg-[#dcfce7]" },
        { name: "Kurti", price: "1299", color: "bg-[#fef3c7]" },
        { name: "Plant", price: "499", color: "bg-[#fce7f3]" },
    ];

    const ProductThumb = ({ product, compact = false }) => (
        <div className="rounded-lg border border-[var(--border)] bg-white p-1.5 shadow-sm">
            <div className={`h-7 rounded-md ${product.color}`} />
            {!compact ? (
                <>
                    <p className="mt-1 truncate text-[9px] font-black leading-none text-[var(--ink)]">{product.name}</p>
                    <p className="mt-0.5 text-[8px] font-bold leading-none text-[var(--success)]">Rs {product.price}</p>
                </>
            ) : null}
        </div>
    );

    return (
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-2xl bg-[linear-gradient(135deg,#eef6fb,#ffffff)] p-3">
            <div className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[var(--accent)] shadow-[0_12px_30px_rgba(15,25,35,0.12)]">
                <Icon className="h-5 w-5" />
            </div>

            {item.visual === "inventory" ? (
                <div className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-2">
                    <div className="w-24 rounded-xl border border-[var(--border)] bg-white p-2 shadow-lg">
                        <div className="mb-1 flex items-center gap-1 text-[8px] font-black text-[var(--success)]">
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            CSV + Rs
                        </div>
                        {[1, 2, 3, 4].map((row) => (
                            <div key={row} className="mb-1 grid grid-cols-[1fr_0.7fr] gap-1">
                                <span className="h-2 rounded bg-[var(--accent-soft)]" />
                                <span className="h-2 rounded bg-[var(--success-bg)]" />
                            </div>
                        ))}
                    </div>
                    <ArrowRight className="h-5 w-5 shrink-0 text-[var(--accent)]" />
                    <div className="grid w-28 grid-cols-2 gap-1.5">
                        {products.map((product) => <ProductThumb key={product.name} product={product} compact />)}
                    </div>
                </div>
            ) : item.visual === "preview" ? (
                <div className="absolute inset-x-3 bottom-3 flex justify-center">
                    <div className="w-32 rounded-[1.35rem] border-[6px] border-[var(--ink)] bg-[var(--ink)] shadow-xl">
                        <div className="overflow-hidden rounded-[0.9rem] bg-white">
                            <div className="bg-[var(--success)] px-2 py-1.5 text-[8px] font-black text-white">Customer catalog</div>
                            <div className="grid grid-cols-2 gap-1.5 p-1.5">
                                {products.slice(0, 4).map((product) => <ProductThumb key={product.name} product={product} />)}
                            </div>
                        </div>
                    </div>
                    <CheckCircle2 className="absolute right-8 top-7 h-7 w-7 rounded-full bg-white text-[var(--success)] shadow-lg" />
                </div>
            ) : item.visual === "publish" ? (
                <div className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-2">
                    <div className="w-24 rounded-xl border border-[var(--border)] bg-white p-2 shadow-lg">
                        <div className="h-10 rounded-lg bg-[#dbeafe]" />
                        <p className="mt-1 text-[9px] font-black leading-none text-[var(--ink)]">New shoe</p>
                        <p className="mt-1 rounded bg-[var(--accent-light)] px-1 py-0.5 text-[8px] font-bold text-[var(--accent)]">Ready post</p>
                    </div>
                    <ArrowRight className="h-5 w-5 shrink-0 text-[var(--accent)]" />
                    <div className="grid gap-2">
                        {[
                            { label: "FB", icon: Camera },
                            { label: "IG", icon: Camera },
                        ].map(({ label, icon: MiniIcon }) => (
                            <span key={label} className="flex h-9 w-11 items-center justify-center gap-1 rounded-xl bg-white text-[var(--success)] shadow-md">
                                <MiniIcon className="h-5 w-5" />
                                <span className="text-[8px] font-black">{label}</span>
                            </span>
                        ))}
                    </div>
                </div>
            ) : item.visual === "whatsapp" ? (
                <div className="absolute inset-x-3 bottom-3 flex justify-center">
                    <div className="w-32 rounded-[1.35rem] border-[6px] border-[var(--ink)] bg-[var(--ink)] shadow-xl">
                        <div className="overflow-hidden rounded-[0.9rem] bg-white">
                            <div className="bg-[var(--success)] px-2 py-1.5 text-[8px] font-black text-white">WhatsApp catalog</div>
                            <div className="space-y-1.5 p-1.5">
                                {[1, 2, 3].map((row) => (
                                    <div key={row} className="flex items-center gap-1.5 rounded-lg bg-[var(--success-bg)] p-1">
                                        <span className="h-5 w-5 rounded bg-white" />
                                        <span className="h-2 flex-1 rounded-full bg-[var(--success)]" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <MessageCircle className="absolute left-8 top-7 h-8 w-8 rounded-xl bg-white p-1.5 text-[var(--success)] shadow-lg" />
                </div>
            ) : item.visual === "content" ? (
                <div className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-2">
                    <div className="w-24 rounded-xl border border-[var(--border)] bg-white p-2 shadow-lg">
                        <div className="h-9 rounded-lg bg-[#fef3c7]" />
                        <p className="mt-1 text-[9px] font-black leading-none text-[var(--ink)]">Product</p>
                    </div>
                    <Sparkles className="h-6 w-6 shrink-0 text-[var(--accent)]" />
                    <div className="space-y-2">
                        {["Caption", "Offer", "#Tags"].map((chip) => <span key={chip} className="block rounded-full bg-white px-2 py-1 text-[8px] font-black text-[var(--accent)] shadow-md">{chip}</span>)}
                    </div>
                </div>
            ) : item.visual === "reel" ? (
                <div className="absolute inset-x-3 bottom-3 flex justify-center">
                    <div className="w-28 rounded-[1.35rem] border-[6px] border-[var(--ink)] bg-[var(--ink)] shadow-xl">
                        <div className="rounded-[0.9rem] bg-[var(--accent)] p-3 text-white">
                            <Film className="mx-auto mt-2 h-8 w-8" />
                            <p className="mt-2 text-center text-[9px] font-black">15 sec reel</p>
                            <div className="mt-4 flex gap-1">
                                {[1, 2, 3].map((clip) => <span key={clip} className="h-6 flex-1 rounded bg-white/45" />)}
                            </div>
                        </div>
                    </div>
                    <Sparkles className="absolute right-10 top-6 h-7 w-7 text-[var(--accent)]" />
                </div>
            ) : item.visual === "calendar" ? (
                <div className="absolute inset-x-3 bottom-3">
                    <div className="rounded-xl border border-[var(--border)] bg-white p-2 shadow-lg">
                        <p className="mb-1 text-[9px] font-black text-[var(--accent)]">Weekly posts</p>
                        <div className="mb-2 flex gap-1.5">
                            {[1, 2, 3, 4, 5].map((dot) => <span key={dot} className="h-2 flex-1 rounded-full bg-[var(--accent)]" />)}
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                            {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => <span key={day} className="h-9 rounded-lg bg-[var(--accent-light)] pt-1 text-center text-[8px] font-black text-[var(--accent)]">{day}</span>)}
                        </div>
                    </div>
                </div>
            ) : item.visual === "stock" ? (
                <div className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-2">
                    <div className="grid w-24 gap-1.5 rounded-xl border border-[var(--border)] bg-white p-2 shadow-lg">
                        {[
                            ["Shoe", "12"],
                            ["Bag", "2"],
                            ["Kurti", "0"],
                        ].map(([name, qty]) => (
                            <div key={name} className="flex items-center justify-between rounded-lg bg-[var(--accent-light)] px-1.5 py-1 text-[8px] font-black text-[var(--ink)]">
                                <span>{name}</span>
                                <span className={qty === "12" ? "text-[var(--success)]" : "text-[var(--warn)]"}>{qty}</span>
                            </div>
                        ))}
                    </div>
                    <RefreshCw className="h-6 w-6 shrink-0 text-[var(--success)]" />
                    <div className="w-20 space-y-1.5">
                        <span className="block rounded-lg bg-[var(--warn-bg)] px-2 py-1 text-[8px] font-black text-[var(--warn)] shadow-md">Low stock</span>
                        <span className="block rounded-lg bg-white px-2 py-1 text-[8px] font-black text-[var(--accent)] shadow-md">Update</span>
                    </div>
                </div>
            ) : item.visual === "billing" ? (
                <div className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-2">
                    <div className="grid w-20 grid-cols-2 gap-1.5">
                        {products.slice(0, 4).map((product) => <ProductThumb key={product.name} product={product} compact />)}
                    </div>
                    <ArrowRight className="h-5 w-5 shrink-0 text-[var(--accent)]" />
                    <div className="w-24 rounded-xl border border-[var(--border)] bg-white p-2 shadow-lg">
                        <p className="mb-1 text-[9px] font-black text-[var(--ink)]">Bill</p>
                        <div className="space-y-1">
                            <span className="block h-1.5 rounded bg-[var(--accent-soft)]" />
                            <span className="block h-1.5 rounded bg-[var(--accent-soft)]" />
                            <span className="block rounded bg-[var(--success-bg)] px-1 py-0.5 text-[8px] font-black text-[var(--success)]">Total Rs</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="absolute inset-x-3 bottom-3">
                    <div className="rounded-xl border border-[var(--border)] bg-white p-2 shadow-lg">
                        <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-[var(--warn-bg)] px-2 py-1 text-[8px] font-black text-[var(--warn)]">
                            <AlertTriangle className="h-4 w-4" />
                            Needs attention
                        </div>
                        <div className="flex items-end gap-2">
                            {[28, 52, 38, 68].map((height, index) => (
                                <span key={height} className={`flex w-1/4 items-end justify-center rounded-t-lg ${index === 1 ? "bg-[var(--warn-bg)] text-[var(--warn)]" : "bg-[var(--accent-light)] text-[var(--accent)]"}`} style={{ height }}>
                                    {index === 1 ? <AlertTriangle className="mb-1 h-3.5 w-3.5" /> : null}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export function SimpleServicesPage() {
    return (
        <main className="gradient-page overflow-hidden">
            <section className="hero-section px-6 py-16 md:px-10 md:py-20">
                <div className="hero-grid-bg" />
                <div className="relative mx-auto max-w-5xl">
                    <div className="hero-pill">
                        <div className="hero-pulse" />
                        Services
                    </div>
                    <h1 className="hero-h1 max-w-4xl md:text-6xl">
                        Everything ORVA helps<br />
                        <span>your business do online.</span>
                    </h1>
                    <p className="hero-sub max-w-xl">
                        Build your product catalog, preview the customer experience, publish product updates, and keep stock changes organized.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        {["GST invoice available", "Secure Razorpay payments", "Fast turnaround", "Hyderabad support"].map((item) => (
                            <span key={item} className="badge badge-blue bg-white/10 text-[#7BA7F0]">
                                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                {item}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            <section className="border-b border-[var(--border)] bg-white">
                <div className="mx-auto max-w-6xl px-6 py-16 md:px-10">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="section-tag">What ORVA provides</p>
                            <h2 className="mt-2 max-w-3xl text-4xl font-bold text-[var(--ink)]">
                                One workspace for product catalog, content, publishing, and updates.
                            </h2>
                        </div>
                        <a href="/auth" className="btn-primary w-fit">
                            Open ORVA
                        </a>
                    </div>

                    <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
                        {platformServices.map((item) => {
                            const Icon = item.icon;
                            return (
                                <article key={item.title} className="interactive-tile group overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[0_20px_60px_rgba(15,25,35,0.08)]">
                                    <ServiceVisual item={item} />
                                    <div className="p-4">
                                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-light)] text-[var(--accent)]">
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <h3 className="text-lg font-bold leading-tight text-[var(--ink)]">{item.title}</h3>
                                        <p className="mt-2 text-sm leading-6 text-[var(--mid)]">{item.desc}</p>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

        </main>
    );
}
