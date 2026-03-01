export default function CounselorLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen bg-[#0f1724]" style={{ background: "#0f1724" }}>
			{children}
		</div>
	);
}
