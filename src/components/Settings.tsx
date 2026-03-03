import { clearAllTracks, exportLibraryData, importLibraryData, getAllTracks } from '../utils/db';

interface SettingsProps {
    accentColor: string;
    setAccentColor: (color: string) => void;
}

const PRESET_COLORS = [
    { name: 'Gold', value: '#EAB308' },
    { name: 'Purple', value: '#A855F7' },
    { name: 'Rose', value: '#F43F5E' },
    { name: 'Cyan', value: '#06B6D4' },
    { name: 'Emerald', value: '#10B981' },
];

export default function Settings({ accentColor, setAccentColor }: SettingsProps) {
    const [storageInfo, setStorageInfo] = useState({ used: 0, total: 0 });
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [diagVisible, setDiagVisible] = useState(false);
    const [diagCount, setDiagCount] = useState(0);
    const [trackCount, setTrackCount] = useState(0);

    useEffect(() => {
        if (navigator.storage && navigator.storage.estimate) {
            navigator.storage.estimate().then(estimate => {
                setStorageInfo({
                    used: estimate.usage || 0,
                    total: estimate.quota || 0
                });
            });
        }
        // Also fetch track count for diagnostics
        getAllTracks().then((tracks: any[]) => setTrackCount(tracks.length));
    }, [isImporting]);

    const handleDiagClick = () => {
        setDiagCount(prev => {
            if (prev + 1 >= 5) {
                setDiagVisible(true);
                return 0;
            }
            return prev + 1;
        });
    };

    const handleClearLibrary = async () => {
        if (confirm('Tem certeza que deseja apagar toda a biblioteca permanentemente?')) {
            await clearAllTracks();
            window.location.reload();
        }
    };

    const handleExport = async () => {
        try {
            setIsExporting(true);
            const jsonData = await exportLibraryData();
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ivan-wangler-backup-${new Date().toISOString().split('T')[0]}.aura`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            alert('Falha ao exportar biblioteca. O arquivo pode ser muito grande para o navegador.');
            console.error(err);
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsImporting(true);
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const content = event.target?.result as string;
                    await importLibraryData(content);
                    alert('Biblioteca importada com sucesso! O aplicativo será reiniciado.');
                    window.location.reload();
                } catch (err) {
                    alert('Erro ao processar o arquivo de backup.');
                }
            };
            reader.readAsText(file);
        } catch (err) {
            alert('Falha ao importar biblioteca.');
            console.error(err);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="flex flex-col h-full px-8 pt-4 pb-12 overflow-y-auto no-scrollbar bg-black/40 backdrop-blur-3xl">
            <div className="mb-10 text-center">
                <h2 className="text-3xl font-display font-bold tracking-tight text-white/90">Aura Settings</h2>
                <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-bold mt-2">Versão 1.1.0 Pro</p>
            </div>

            <div className="space-y-8">
                {/* Appearance Section */}
                <section>
                    <div className="flex items-center space-x-3 mb-4">
                        <Palette size={18} className="text-accent" />
                        <h3 className="text-[10px] uppercase tracking-[0.2em] font-display font-bold text-white/40">Customização</h3>
                    </div>
                    <div className="glass-card rounded-[32px] p-6 border-white/5 space-y-6">
                        <div>
                            <p className="text-xs font-bold text-white/80 mb-4">Cor de Destaque (Accent)</p>
                            <div className="flex flex-wrap gap-4">
                                {PRESET_COLORS.map((color) => (
                                    <button
                                        key={color.value}
                                        onClick={() => setAccentColor(color.value)}
                                        className={`w-10 h-10 rounded-full transition-all border-2 flex items-center justify-center ${accentColor === color.value ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'border-transparent hover:scale-105'}`}
                                        style={{ backgroundColor: color.value }}
                                        title={color.name}
                                    >
                                        {accentColor === color.value && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Sincronização Section */}
                <section>
                    <div className="flex items-center space-x-3 mb-4">
                        <Share2 size={18} className="text-accent" />
                        <h3 className="text-[10px] uppercase tracking-[0.2em] font-display font-bold text-white/40 cursor-pointer select-none" onClick={handleDiagClick}>Sincronização & Backup</h3>
                    </div>
                    {diagVisible && (
                        <div className="mx-6 mb-4 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                            <p className="text-[10px] font-mono text-accent">DIAGNOSTIC MODE ENABLED</p>
                            <div className="grid grid-cols-2 gap-2 text-[9px] text-white/60 font-mono">
                                <p>Tracks DB: {trackCount}</p>
                                <p>jsmediatags: {(window as any).jsmediatags ? 'OK' : 'FAIL'}</p>
                                <p>Storage: {(storageInfo.used / 1024 / 1024).toFixed(1)}MB</p>
                                <p>UA: {navigator.userAgent.includes('Mobi') ? 'Mobile' : 'Desktop'}</p>
                            </div>
                            <button onClick={() => setDiagVisible(false)} className="text-[9px] text-white/20 hover:text-white underline mt-2">Close Diagnostics</button>
                        </div>
                    )}
                    <div className="glass-card rounded-[32px] overflow-hidden border-white/5 divide-y divide-white/5">
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-all group disabled:opacity-50"
                        >
                            <div className="flex items-center space-x-4">
                                <div className="p-2.5 rounded-2xl bg-accent/10 text-accent group-hover:scale-110 transition-transform">
                                    {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-bold text-white/90">Exportar Biblioteca</p>
                                    <p className="text-[9px] text-white/30">Cria um arquivo .aura com músicas e capas</p>
                                </div>
                            </div>
                            <ChevronRight size={16} className="text-white/10 group-hover:text-accent" />
                        </button>

                        <button
                            onClick={handleImportClick}
                            disabled={isImporting}
                            className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-all group disabled:opacity-50"
                        >
                            <div className="flex items-center space-x-4">
                                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
                                    {isImporting ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-bold text-white/90">Importar Biblioteca</p>
                                    <p className="text-[9px] text-white/30">Restaura músicas de um arquivo .aura</p>
                                </div>
                            </div>
                            <ChevronRight size={16} className="text-white/10 group-hover:text-emerald-500" />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".aura,.json"
                            className="hidden"
                        />
                    </div>
                </section>

                {/* Data Management Section */}
                <section>
                    <div className="flex items-center space-x-3 mb-4">
                        <Laptop size={18} className="text-accent" />
                        <h3 className="text-[10px] uppercase tracking-[0.2em] font-display font-bold text-white/40">Gerenciamento de Dados</h3>
                    </div>

                    {/* Storage Info */}
                    <div className="glass-card rounded-[32px] p-5 border-white/5 flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-xl bg-accent/10 text-accent">
                                <Folder size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] font-display font-bold uppercase tracking-wider">Device Storage</p>
                                <p className="text-[9px] text-white/30 font-mono">
                                    {(storageInfo.used / 1024 / 1024 / 1024).toFixed(1)} GB /
                                    {(storageInfo.total / 1024 / 1024 / 1024).toFixed(1)} GB used
                                </p>
                            </div>
                        </div>
                        <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-accent shadow-[0_0_10px_rgba(0,212,255,0.5)] transition-all duration-500"
                                style={{ width: `${(storageInfo.total > 0 ? (storageInfo.used / storageInfo.total) * 100 : 0)}%` }}
                            />
                        </div>
                    </div>

                    <div className="glass-card rounded-[32px] p-2 border-white/5 overflow-hidden">
                        <button
                            onClick={handleClearLibrary}
                            className="w-full flex items-center justify-between p-4 hover:bg-red-500/10 transition-all group"
                        >
                            <div className="flex items-center space-x-4">
                                <div className="p-2.5 rounded-2xl bg-red-500/10 text-red-500 group-hover:scale-110 transition-transform">
                                    <Trash2 size={18} />
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-bold text-white/90">Limpar Biblioteca</p>
                                    <p className="text-[9px] text-white/30">Apagar todos os dados do IndexedDB</p>
                                </div>
                            </div>
                            <ChevronRight size={16} className="text-white/10 group-hover:text-red-500" />
                        </button>
                    </div>
                </section>

                {/* Legal / About Section */}
                <section>
                    <div className="flex items-center space-x-3 mb-4">
                        <ShieldCheck size={18} className="text-accent" />
                        <h3 className="text-[10px] uppercase tracking-[0.2em] font-display font-bold text-white/40">Sobre</h3>
                    </div>
                    <div className="glass-card rounded-[32px] p-6 border-white/5 text-center">
                        <p className="text-[11px] leading-relaxed text-white/40 italic font-medium">
                            "Dedicated to the pursuit of pure, unadulterated sound. High Fidelity is not a preference, it's a standard."
                        </p>
                        <div className="h-px w-12 bg-accent/20 mx-auto my-6" />
                        <p className="text-[10px] font-bold text-accent tracking-[0.1em]">Ivan Wangler Architecture</p>
                    </div>
                </section>
            </div>

            <div className="mt-12 text-center opacity-20 hover:opacity-100 transition-opacity cursor-default">
                <p className="text-[8px] uppercase tracking-[0.5em] font-bold">Premium High Fidelity Hub</p>
            </div>
        </div>
    );
}
