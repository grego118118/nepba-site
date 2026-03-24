import Link from "next/link";
import { Download, FileText, Scale, Shield, Archive } from "lucide-react";

interface Resource {
    id: string;
    title: string;
    description: string;
    category: "Contract" | "Rights" | "Forms" | "Archive";
    date: string;
    size: string;
    downloadUrl: string;
    icon: any;
}

const RESOURCES: Resource[] = [
    {
        id: "cba-2023-2026",
        title: "Collective Bargaining Agreement 2023-2026",
        description: "Current main contract valid through June 30, 2026.",
        category: "Contract",
        date: "July 1, 2023",
        size: "2.4 MB",
        downloadUrl: "#", // Placeholder
        icon: Scale
    },
    {
        id: "weingarten",
        title: "Weingarten Rights Card",
        description: "Printable card to read when questioned by administration.",
        category: "Rights",
        date: "Updated 2024",
        size: "150 KB",
        downloadUrl: "#", // Placeholder
        icon: Shield
    },
    {
        id: "bylaws",
        title: "Local 190 Constitution & Bylaws",
        description: "Governance definition for NEPBA Local 190.",
        category: "Contract",
        date: "Rev. 2022",
        size: "1.1 MB",
        downloadUrl: "#", // Placeholder
        icon: FileText
    },
    {
        id: "detail-rates",
        title: "Detail Rate Sheet FY25",
        description: "Current private and town detail rates.",
        category: "Forms",
        date: "July 2024",
        size: "400 KB",
        downloadUrl: "#", // Placeholder
        icon: FileText
    }
];

export default function DocumentsPage() {
    return (
        <main className="min-h-screen bg-slate-900 text-slate-100">
            <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-10 md:px-8">
                <header className="flex flex-col gap-2 border-b border-slate-800 pb-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-blue-300">
                            NEPBA Local 190
                        </p>
                        <h1 className="text-xl font-semibold text-slate-50 md:text-2xl">
                            Documents & Resources
                        </h1>
                        <p className="text-xs text-slate-400 md:text-sm">
                            Access contracts, rate sheets, and union rights information.
                        </p>
                    </div>
                    <div className="mt-2 flex flex-col items-end gap-1 md:mt-0">
                        <Link
                            href="/dashboard"
                            className="text-xs font-medium text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
                        >
                            Back to dashboard
                        </Link>
                    </div>
                </header>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {RESOURCES.map((res) => (
                        <div key={res.id} className="group relative flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/50 p-5 shadow-sm transition-all hover:border-slate-700 hover:bg-slate-800/40 hover:shadow-md">
                            <div>
                                <div className="mb-4 flex items-start justify-between">
                                    <div className="rounded-lg bg-slate-800 p-2 text-blue-400 group-hover:bg-slate-700 group-hover:text-blue-300">
                                        <res.icon size={24} />
                                    </div>
                                    <span className={`rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wide border ${res.category === 'Contract' ? 'bg-purple-500/10 text-purple-300 border-purple-500/20' :
                                            res.category === 'Rights' ? 'bg-red-500/10 text-red-300 border-red-500/20' :
                                                'bg-blue-500/10 text-blue-300 border-blue-500/20'
                                        }`}>
                                        {res.category}
                                    </span>
                                </div>
                                <h3 className="mb-2 text-base font-semibold text-slate-100">{res.title}</h3>
                                <p className="text-sm text-slate-400 leading-relaxed mb-4">{res.description}</p>
                            </div>

                            <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-500">Updated: {res.date}</span>
                                    <span className="text-[10px] text-slate-500">Size: {res.size}</span>
                                </div>
                                <button className="flex items-center gap-2 rounded bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-blue-600 hover:text-white">
                                    <Download size={14} />
                                    Download
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Request Box */}
                    <div className="flex flex-col justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/20 p-5 text-center">
                        <div className="mx-auto mb-3 rounded-full bg-slate-800 p-3 text-slate-500">
                            <Archive size={20} />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-300">Need something else?</h3>
                        <p className="mt-1 text-xs text-slate-500 mb-4">
                            Looking for archived contracts or specific MOUs?
                        </p>
                        <Link href="/dashboard/grievances" className="mx-auto rounded px-4 py-2 text-xs font-medium text-blue-400 transition-colors hover:text-blue-300 hover:underline">
                            Contact E-Board
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
