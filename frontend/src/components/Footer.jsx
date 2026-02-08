export default function Footer() {
  return (
    <footer className="border-t border-slate-700 mt-12 py-6">
      <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm space-y-1">
        <p>
          資料來源:{" "}
          <a href="https://pubchem.ncbi.nlm.nih.gov/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-amber-400 transition-colors">
            PubChem (NIH)
          </a>
          {" "}| 僅供參考，請以官方 SDS 為準
        </p>
        <p className="text-slate-600">
          v1.4.0 |{" "}
          <a href="https://github.com/rjsky311/GHS-label-quick-search/issues" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors">
            回報問題
          </a>
        </p>
      </div>
    </footer>
  );
}
