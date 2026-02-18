import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { calculateAdvancedReportFromValues, sectorAOV, type AdvancedReport } from '@/lib/reportCalculations';
import AdvancedReportComponent from '@/components/AdvancedReport';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, RotateCcw, Copy, Check } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminFormData {
  sector: string;
  customSector: string;
  website: string;
  monthlyRevenue: string;
  adsInvestment: string;
  emailRevenuePercentage: string;
  listSize: string;
  // Popup & Optin (step 6)
  hasPopup: boolean;
  popupConversionRate: string;    // %
  monthlyVisitors: string;
  monthlyListGrowthRate: string;  // % crescita lista mensile
  aov: string;                    // nuovo: AOV reale cliente
  emailFrequency: string;
  activeFlows: string[];
  motivation: string;
  clientName: string;
  scenarioConservative: string;   // default '15'
  scenarioModerate: string;       // default '35'
  scenarioAggressive: string;     // default '60'
  showInvestment: boolean;        // mostrare sezione investimento nel report?
}

// ─── Animation variants ───────────────────────────────────────────────────────

const pageVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir < 0 ? 80 : -80, opacity: 0 }),
};

// ─── Option buttons helper ────────────────────────────────────────────────────

const OptionButton: React.FC<{
  selected: boolean;
  onClick: () => void;
  label: string;
  description?: string;
}> = ({ selected, onClick, label, description }) => (
  <button
    onClick={onClick}
    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
      selected
        ? 'border-orange bg-orange/10 text-white'
        : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-400 hover:bg-slate-700'
    }`}
  >
    <span className="font-medium">{label}</span>
    {description && <span className="block text-sm text-slate-400 mt-0.5">{description}</span>}
  </button>
);

// ─── Scenario slider row ──────────────────────────────────────────────────────

const ScenarioSlider: React.FC<{
  label: string;
  color: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}> = ({ label, color, value, min, max, onChange }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <span className={`text-sm font-semibold ${color}`}>{label}</span>
      <span className={`text-lg font-bold ${color}`}>{value}%</span>
    </div>
    <Slider
      min={min}
      max={max}
      step={1}
      value={[value]}
      onValueChange={(v) => onChange(v[0])}
      className="w-full"
    />
    <div className="flex justify-between text-xs text-slate-500">
      <span>{min}%</span>
      <span>{max}%</span>
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

export const AdminSurvey: React.FC = () => {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [report, setReport] = useState<AdvancedReport | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [formData, setFormData] = useState<AdminFormData>({
    sector: '',
    customSector: '',
    website: '',
    monthlyRevenue: '',
    adsInvestment: '',
    emailRevenuePercentage: '',
    listSize: '',
    hasPopup: false,
    popupConversionRate: '',
    monthlyVisitors: '',
    monthlyListGrowthRate: '2',
    aov: '',
    emailFrequency: '',
    activeFlows: [],
    motivation: '',
    clientName: '',
    scenarioConservative: '15',
    scenarioModerate: '35',
    scenarioAggressive: '60',
    showInvestment: false,
  });

  // ── Helpers ────────────────────────────────────────────────────────────────

  const saveReportToDb = async (result: AdvancedReport, fd: AdminFormData) => {
    try {
      const { data: saved, error } = await supabase
        .from('survey_submissions')
        .insert({
          full_name: fd.clientName || 'Report Admin',
          email: `admin-${Date.now()}@interno.mailift`,
          phone: null,
          sector: fd.sector || 'other',
          website: fd.website || null,
          report_data: {
            clientReport: result,
            meta: {
              showInvestment: fd.showInvestment ?? false,
              clientName: fd.clientName || '',
              website: fd.website || '',
            },
          } as any,
          email_health_score: result.emailHealthScore,
          yearly_potential: result.yearlyPotential,
          qualified: false,
          status: 'admin_report',
        })
        .select('id')
        .single();

      if (error) {
        console.error('DB insert error:', error.code, error.message, error.details);
        setReportId(null);
      } else if (saved) {
        setReportId(saved.id);
      }
    } catch (e) {
      console.error('DB save exception:', e);
      setReportId(null);
    }
  };

  const go = (delta: 1 | -1) => {
    setDirection(delta);
    setStep(s => s + delta);
  };

  const toggleFlow = (flow: string) => {
    setFormData(prev => ({
      ...prev,
      activeFlows: prev.activeFlows.includes(flow)
        ? prev.activeFlows.filter(f => f !== flow)
        : [...prev.activeFlows, flow],
    }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    const revenue = parseFloat(formData.monthlyRevenue) || 0;
    const emailPct = parseFloat(formData.emailRevenuePercentage) || 0;
    const list = parseFloat(formData.listSize) || 0;
    const customAov = formData.aov ? parseFloat(formData.aov) : undefined;

    const scenarioOverrides = {
      conservative: parseFloat(formData.scenarioConservative) || 15,
      moderate: parseFloat(formData.scenarioModerate) || 35,
      aggressive: parseFloat(formData.scenarioAggressive) || 60,
    };

    // Parametri popup — passati sempre se popup attivo (anche con visitatori = 0)
    const popupParams = formData.hasPopup
      ? {
          hasPopup: true,
          conversionRate: parseFloat(formData.popupConversionRate) || 0,
          monthlyVisitors: parseFloat(formData.monthlyVisitors) || 0,
          monthlyListGrowthRate: parseFloat(formData.monthlyListGrowthRate) || 2,
        }
      : {
          hasPopup: false,
          conversionRate: 0,
          monthlyVisitors: 0,
          monthlyListGrowthRate: 0,
        };

    const result = calculateAdvancedReportFromValues(
      formData.sector || 'other',
      revenue,
      emailPct,
      list,
      formData.activeFlows,
      formData.sector === 'other' ? formData.customSector : undefined,
      formData.emailFrequency || 'none',
      customAov,
      scenarioOverrides,
      popupParams,
    );

    // Salva su DB per link condivisibile
    await saveReportToDb(result, formData);

    setReport(result);
    setIsGenerating(false);
  };

  const handleCopyLink = () => {
    if (!reportId) return;
    const url = `https://quiz-to-customer.lovable.app/report/${reportId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleRestart = () => {
    setReport(null);
    setReportId(null);
    setCopied(false);
    setStep(0);
    setFormData({
      sector: '',
      customSector: '',
      website: '',
      monthlyRevenue: '',
      adsInvestment: '',
      emailRevenuePercentage: '',
      listSize: '',
      hasPopup: false,
      popupConversionRate: '',
      monthlyVisitors: '',
      monthlyListGrowthRate: '2',
      aov: '',
      emailFrequency: '',
      activeFlows: [],
      motivation: '',
      clientName: '',
      scenarioConservative: '15',
      scenarioModerate: '35',
      scenarioAggressive: '60',
      showInvestment: false,
    });
  };

  // Benchmark AOV per settore selezionato (per placeholder step AOV)
  const benchmarkAov = formData.sector ? (sectorAOV[formData.sector] ?? sectorAOV.other) : null;

  // ── Steps definition ───────────────────────────────────────────────────────

  const STEPS = [
    // 0 — Settore
    {
      title: 'Settore e-commerce',
      canProceed: !!formData.sector && (formData.sector !== 'other' || !!formData.customSector.trim()),
      content: (
        <div className="space-y-3">
          {[
            { value: 'beauty', label: 'Beauty & Personal Care' },
            { value: 'fashion', label: 'Abbigliamento & Moda' },
            { value: 'food', label: 'Food & Beverage' },
            { value: 'digital', label: 'Prodotti Digitali' },
            { value: 'jewelry', label: 'Gioielli & Accessori' },
            { value: 'home', label: 'Articoli Casa & Living' },
            { value: 'health', label: 'Salute & Integratori' },
            { value: 'other', label: 'Altro settore' },
          ].map(opt => (
            <OptionButton
              key={opt.value}
              selected={formData.sector === opt.value}
              onClick={() => setFormData(p => ({ ...p, sector: opt.value }))}
              label={opt.label}
            />
          ))}
          {formData.sector === 'other' && (
            <div className="pt-2">
              <Input
                placeholder="Specifica il settore..."
                value={formData.customSector}
                onChange={e => setFormData(p => ({ ...p, customSector: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
          )}
        </div>
      ),
    },

    // 1 — Sito web (facoltativo)
    {
      title: 'Sito web del cliente',
      canProceed: true,
      content: (
        <div className="space-y-4">
          <p className="text-slate-400 text-sm">Facoltativo — apparirà nel sottotitolo del report.</p>
          <div>
            <Label className="text-slate-300 mb-2 block">🌐 URL del sito</Label>
            <Input
              placeholder="es. nomeazienda.com"
              value={formData.website}
              onChange={e => setFormData(p => ({ ...p, website: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
            />
          </div>
        </div>
      ),
    },

    // 2 — Fatturato mensile (input libero)
    {
      title: 'Fatturato mensile (€)',
      canProceed: !!formData.monthlyRevenue && parseFloat(formData.monthlyRevenue) > 0,
      content: (
        <div className="space-y-4">
          <p className="text-slate-400 text-sm">Digita il valore esatto in euro.</p>
          <div>
            <Label className="text-slate-300 mb-2 block">💶 Fatturato mensile</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">€</span>
              <Input
                type="number"
                placeholder="es. 45000"
                min={0}
                value={formData.monthlyRevenue}
                onChange={e => setFormData(p => ({ ...p, monthlyRevenue: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 pl-8"
              />
            </div>
            {formData.monthlyRevenue && (
              <p className="text-orange text-sm mt-2 font-medium">
                ≈ €{Number(formData.monthlyRevenue).toLocaleString('it-IT')}/mese
              </p>
            )}
          </div>
        </div>
      ),
    },

    // 3 — Investimento Ads
    {
      title: 'Investimento in advertising',
      canProceed: !!formData.adsInvestment,
      content: (
        <div className="space-y-3">
          {[
            { value: 'none', label: 'Nessun investimento' },
            { value: 'under-2k', label: 'Meno di €2.000/mese' },
            { value: '2-5k', label: '€2.000 – €5.000/mese' },
            { value: '5-15k', label: '€5.000 – €15.000/mese' },
            { value: '15-30k', label: '€15.000 – €30.000/mese' },
            { value: '30k+', label: 'Oltre €30.000/mese' },
          ].map(opt => (
            <OptionButton
              key={opt.value}
              selected={formData.adsInvestment === opt.value}
              onClick={() => setFormData(p => ({ ...p, adsInvestment: opt.value }))}
              label={opt.label}
            />
          ))}
        </div>
      ),
    },

    // 4 — % fatturato da email (input libero)
    {
      title: '% fatturato da email',
      canProceed: !!formData.emailRevenuePercentage &&
        parseFloat(formData.emailRevenuePercentage) > 0 &&
        parseFloat(formData.emailRevenuePercentage) <= 100,
      content: (
        <div className="space-y-4">
          <p className="text-slate-400 text-sm">Percentuale del fatturato mensile generata dall'email marketing.</p>
          <div>
            <Label className="text-slate-300 mb-2 block">📧 % da email marketing</Label>
            <div className="relative">
              <Input
                type="number"
                placeholder="es. 22"
                min={0}
                max={100}
                value={formData.emailRevenuePercentage}
                onChange={e => setFormData(p => ({ ...p, emailRevenuePercentage: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">%</span>
            </div>
            {formData.emailRevenuePercentage && formData.monthlyRevenue && (
              <p className="text-orange text-sm mt-2 font-medium">
                ≈ €{Math.round(parseFloat(formData.monthlyRevenue) * parseFloat(formData.emailRevenuePercentage) / 100).toLocaleString('it-IT')}/mese da email
              </p>
            )}
          </div>
        </div>
      ),
    },

    // 5 — Dimensione lista (input libero)
    {
      title: 'Dimensione lista email',
      canProceed: !!formData.listSize && parseFloat(formData.listSize) >= 0,
      content: (
        <div className="space-y-4">
          <p className="text-slate-400 text-sm">Numero totale di iscritti attivi alla lista email.</p>
          <div>
            <Label className="text-slate-300 mb-2 block">👥 Iscritti in lista</Label>
            <Input
              type="number"
              placeholder="es. 8500"
              min={0}
              value={formData.listSize}
              onChange={e => setFormData(p => ({ ...p, listSize: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
            />
            {formData.listSize && (
              <p className="text-orange text-sm mt-2 font-medium">
                {Number(formData.listSize).toLocaleString('it-IT')} iscritti
              </p>
            )}
          </div>
        </div>
      ),
    },


    // 6 — Popup & Acquisizione Optin (NUOVO)
    {
      title: '📊 Popup & Acquisizione Optin',
      canProceed: true, // facoltativo
      content: (
        <div className="space-y-4">
          <p className="text-slate-400 text-sm">
            Facoltativo — se compilato, apparirà nel report una sezione dedicata alla crescita lista tramite popup.
          </p>

          {/* Toggle popup attivo */}
          <div className="flex items-center justify-between bg-slate-700/40 px-4 py-3 rounded-xl border border-slate-600/50">
            <div>
              <p className="text-white font-semibold text-sm">Ha un popup di raccolta email attivo?</p>
              <p className="text-slate-400 text-xs mt-0.5">Es. popup benvenuto, exit-intent, sconto first order</p>
            </div>
            <button
              onClick={() => setFormData(p => ({ ...p, hasPopup: !p.hasPopup }))}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ${
                formData.hasPopup ? 'bg-orange' : 'bg-slate-600'
              }`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                formData.hasPopup ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Campi aggiuntivi visibili solo se popup attivo */}
          {formData.hasPopup && (
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-slate-300 mb-2 block">🌐 Visitatori mensili al sito</Label>
                <Input
                  type="number"
                  placeholder="es. 15000"
                  min={0}
                  value={formData.monthlyVisitors}
                  onChange={e => setFormData(p => ({ ...p, monthlyVisitors: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">📊 Tasso conversione popup (%)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="es. 3.5"
                    min={0}
                    max={100}
                    step={0.1}
                    value={formData.popupConversionRate}
                    onChange={e => setFormData(p => ({ ...p, popupConversionRate: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">%</span>
                </div>
                <p className="text-slate-500 text-xs mt-1">Benchmark e-commerce: 3%–5%</p>
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">📈 Crescita lista mensile stimata (%)</Label>
                <div className="space-y-2">
                  {[
                    { value: '1', label: '+1%/mese', desc: 'Crescita lenta' },
                    { value: '2', label: '+2%/mese', desc: 'Crescita media' },
                    { value: '5', label: '+5%/mese', desc: 'Crescita accelerata' },
                    { value: '10', label: '+10%/mese', desc: 'Crescita aggressiva' },
                  ].map(opt => (
                    <OptionButton
                      key={opt.value}
                      selected={formData.monthlyListGrowthRate === opt.value}
                      onClick={() => setFormData(p => ({ ...p, monthlyListGrowthRate: opt.value }))}
                      label={opt.label}
                      description={opt.desc}
                    />
                  ))}
                </div>
              </div>
              {/* Preview nuovi iscritti */}
              {formData.monthlyVisitors && formData.popupConversionRate && (
                <div className="bg-teal-900/20 border border-teal-500/30 rounded-xl p-3">
                  <p className="text-teal-400 text-sm font-semibold">
                    ≈ {Math.round(parseFloat(formData.monthlyVisitors) * (parseFloat(formData.popupConversionRate) / 100)).toLocaleString('it-IT')} nuovi iscritti/mese dal popup
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ),
    },

    // 7 — AOV reale
    {
      title: 'Valore medio ordine (AOV)',
      canProceed: true, // facoltativo
      content: (
        <div className="space-y-4">
          <p className="text-slate-400 text-sm">
            Inserisci il ticket medio degli ordini del cliente. Se lasci vuoto verrà usato il benchmark di settore.
          </p>
          {benchmarkAov && (
            <div className="bg-slate-700/40 px-4 py-3 rounded-lg border border-slate-600/50 flex items-center justify-between">
              <span className="text-slate-400 text-sm">Benchmark settore</span>
              <span className="text-orange font-bold">€{benchmarkAov}</span>
            </div>
          )}
          <div>
            <Label className="text-slate-300 mb-2 block">💶 AOV reale cliente</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">€</span>
              <Input
                type="number"
                placeholder={benchmarkAov ? `es. ${benchmarkAov} (benchmark)` : 'es. 75'}
                min={1}
                value={formData.aov}
                onChange={e => setFormData(p => ({ ...p, aov: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 pl-8"
              />
            </div>
            {formData.aov && (
              <p className="text-green-400 text-sm mt-2 font-medium">
                ✅ AOV reale: €{Number(formData.aov).toLocaleString('it-IT')} — sarà usato nel forecast lista
              </p>
            )}
          </div>
        </div>
      ),
    },



    // 7 — Frequenza invio
    {
      title: 'Frequenza invio email',
      canProceed: !!formData.emailFrequency,
      content: (
        <div className="space-y-3">
          {[
            { value: 'none', label: 'Non invio email', desc: '0 invii/mese' },
            { value: '1-2', label: '1-2 volte a settimana', desc: '≈ 4–8 invii/mese' },
            { value: '3-4', label: '3-4 volte a settimana', desc: '≈ 12–16 invii/mese' },
            { value: '5-7', label: '5-7 volte a settimana', desc: '≈ 20–28 invii/mese' },
            { value: 'daily+', label: 'Più volte al giorno', desc: '30+ invii/mese' },
          ].map(opt => (
            <OptionButton
              key={opt.value}
              selected={formData.emailFrequency === opt.value}
              onClick={() => setFormData(p => ({ ...p, emailFrequency: opt.value }))}
              label={opt.label}
              description={opt.desc}
            />
          ))}
        </div>
      ),
    },

    // 8 — Automazioni attive
    {
      title: 'Automazioni email attive',
      canProceed: true,
      content: (
        <div className="space-y-3">
          <p className="text-slate-400 text-sm">Seleziona tutte le automazioni già configurate (anche nessuna).</p>
          {[
            { key: 'welcome', label: 'Welcome Flow', desc: 'Benvenuto nuovi iscritti' },
            { key: 'cart_recovery', label: 'Recupero Carrello', desc: 'Abbandono carrello' },
            { key: 'checkout_recovery', label: 'Recupero Checkout', desc: 'Abbandono checkout' },
            { key: 'browse_abandonment', label: 'Browse Abandonment', desc: 'Navigazione senza acquisto' },
            { key: 'upsell', label: 'Post-Purchase & Upsell', desc: 'Dopo acquisto' },
            { key: 'winback', label: 'Winback', desc: 'Riattivazione dormienti' },
            { key: 'sunset', label: 'Sunset Flow', desc: 'Pulizia lista' },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => toggleFlow(opt.key)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                formData.activeFlows.includes(opt.key)
                  ? 'border-orange bg-orange/10 text-white'
                  : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-400 hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  formData.activeFlows.includes(opt.key) ? 'border-orange bg-orange' : 'border-slate-500'
                }`}>
                  {formData.activeFlows.includes(opt.key) && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div>
                  <span className="font-medium block">{opt.label}</span>
                  <span className="text-slate-400 text-xs">{opt.desc}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      ),
    },

    // 9 — Motivazione
    {
      title: 'Principale obiettivo del cliente',
      canProceed: !!formData.motivation,
      content: (
        <div className="space-y-3">
          {[
            { value: 'more-revenue', label: '💰 Aumentare il fatturato da email' },
            { value: 'automation', label: '⚙️ Automatizzare le comunicazioni' },
            { value: 'retention', label: '🔄 Migliorare la retention clienti' },
            { value: 'list-growth', label: '📈 Far crescere la lista' },
            { value: 'deliverability', label: '📬 Migliorare la deliverability' },
            { value: 'start', label: '🚀 Iniziare con l\'email marketing' },
          ].map(opt => (
            <OptionButton
              key={opt.value}
              selected={formData.motivation === opt.value}
              onClick={() => setFormData(p => ({ ...p, motivation: opt.value }))}
              label={opt.label}
            />
          ))}
        </div>
      ),
    },

    // 10 — Nome cliente (facoltativo)
    {
      title: 'Nome cliente (facoltativo)',
      canProceed: true,
      content: (
        <div className="space-y-4">
          <p className="text-slate-400 text-sm">Verrà mostrato nell'intestazione del report per personalizzarlo.</p>
          <div>
            <Label className="text-slate-300 mb-2 block">👤 Nome cliente</Label>
            <Input
              placeholder="es. Marco Rossi"
              value={formData.clientName}
              onChange={e => setFormData(p => ({ ...p, clientName: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
            />
          </div>
        </div>
      ),
    },

    // 11 — Impostazioni Report (NUOVO)
    {
      title: '⚙️ Impostazioni Report',
      canProceed: true,
      content: (
        <div className="space-y-6">
          <p className="text-slate-400 text-sm">
            Personalizza le percentuali di crescita degli scenari. Il <strong className="text-white">potenziale annuo</strong> nel banner finale rifletterà lo scenario <span className="text-orange font-semibold">Moderato</span>.
          </p>

          {/* Preview dinamico */}
          {formData.monthlyRevenue && formData.emailRevenuePercentage && (
            <div className="bg-slate-700/40 rounded-lg border border-orange/20 p-4 space-y-2">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Anteprima Recupero Annuo (Scenario Moderato)</p>
              {(() => {
                const rev = parseFloat(formData.monthlyRevenue) || 0;
                const emailPct = parseFloat(formData.emailRevenuePercentage) || 0;
                const currentEmailRev = rev * (emailPct / 100);
                const benchmarkRev = rev * 0.35;
                const gap = Math.max(0, benchmarkRev - currentEmailRev);
                const moderatePct = parseFloat(formData.scenarioModerate) || 35;
                const yearlyRecovery = Math.round(gap * (moderatePct / 100) * 12);
                return (
                  <>
                    <p className="text-2xl font-bold text-orange">
                      €{yearlyRecovery.toLocaleString('it-IT')}
                    </p>
                    <p className="text-slate-500 text-xs">
                      Gap mensile €{Math.round(gap).toLocaleString('it-IT')}/mese × {moderatePct}% (moderato) × 12 mesi
                    </p>
                  </>
                );
              })()}
            </div>
          )}


          <div className="space-y-6">
            <ScenarioSlider
              label="🟢 Conservativo"
              color="text-green-400"
              value={parseInt(formData.scenarioConservative) || 15}
              min={5}
              max={30}
              onChange={v => setFormData(p => ({ ...p, scenarioConservative: String(v) }))}
            />
            <ScenarioSlider
              label="🟠 Moderato (usa per Potenziale Annuo)"
              color="text-orange"
              value={parseInt(formData.scenarioModerate) || 35}
              min={15}
              max={60}
              onChange={v => setFormData(p => ({ ...p, scenarioModerate: String(v) }))}
            />
            <ScenarioSlider
              label="🟣 Aggressivo"
              color="text-purple-400"
              value={parseInt(formData.scenarioAggressive) || 60}
              min={30}
              max={120}
              onChange={v => setFormData(p => ({ ...p, scenarioAggressive: String(v) }))}
            />
          </div>
        </div>
      ),
    },

    // 12 — Investimento & ROI (NUOVO)
    {
      title: '💼 Investimento & ROI',
      canProceed: true,
      content: (
        <div className="space-y-5">
          {/* Toggle ON/OFF */}
          <p className="text-slate-400 text-sm">
            Attiva la sezione Investimento & ROI nel report. Potrai inserire i costi (setup, fee mensile, commissione %) direttamente nel report generato, dopo aver visto i risultati.
          </p>
          <div className="flex items-center justify-between bg-slate-700/40 px-4 py-3 rounded-xl border border-slate-600/50">
            <div>
              <p className="text-white font-semibold text-sm">Mostrare sezione investimento nel report?</p>
              <p className="text-slate-400 text-xs mt-0.5">I valori si inseriscono direttamente nel report</p>
            </div>
            <button
              onClick={() => setFormData(p => ({ ...p, showInvestment: !p.showInvestment }))}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ${
                formData.showInvestment ? 'bg-orange' : 'bg-slate-600'
              }`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                formData.showInvestment ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          {formData.showInvestment && (
            <div className="bg-teal-900/20 border border-teal-500/30 rounded-xl p-4">
              <p className="text-teal-400 text-sm font-semibold mb-1">✅ Sezione attivata</p>
              <p className="text-slate-400 text-xs leading-relaxed">
                Nel report generato troverai un form inline per inserire Setup (€), Fee fissa (€/mese) e Commissione (%). La tabella ROI e il break-even si aggiorneranno in tempo reale.
              </p>
            </div>
          )}
        </div>
      ),
    },
  ];

  const currentStepData = STEPS[step];
  const totalSteps = STEPS.length;

  // ── Dati investimento da passare al report (solo flag show) ───────────────

  const investmentData = {
    show: formData.showInvestment,
    currentEmailRevenue: formData.monthlyRevenue && formData.emailRevenuePercentage
      ? parseFloat(formData.monthlyRevenue) * (parseFloat(formData.emailRevenuePercentage) / 100)
      : 0,
  };

  // ── Report view ────────────────────────────────────────────────────────────

  if (report) {
    return (
      <div>
        <div className="bg-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-700 gap-3 flex-wrap">
          <span className="text-orange font-bold text-sm flex items-center gap-2">
            🔒 Admin Mode
          </span>
          <div className="flex items-center gap-3">
            {/* Pulsante copia link — sempre visibile dopo la generazione */}
            {reportId ? (
              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-all duration-200 ${
                  copied
                    ? 'border-green-500 bg-green-500/10 text-green-400'
                    : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-orange hover:text-orange'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Link copiato!' : 'Copia link'}
              </button>
            ) : (
              <button
                onClick={async () => {
                  if (!report) return;
                  await saveReportToDb(report, formData);
                }}
                title="Salvataggio non riuscito — clicca per riprovare"
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-red-500/40 bg-red-900/20 text-red-400 hover:border-red-400 hover:bg-red-900/40 transition-all duration-200"
              >
                ⚠️ Link non disponibile — Riprova
              </button>
            )}
            <button
              onClick={handleRestart}
              className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Nuovo report
            </button>
          </div>
        </div>
        <AdvancedReportComponent
          report={report}
          userName={formData.clientName || 'Cliente'}
          website={formData.website}
          onRestart={handleRestart}
          investmentData={investmentData}

        />
      </div>
    );
  }

  // ── Quiz view ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Progress bar */}
      <div className="w-full bg-slate-800 px-4 py-5">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Step {step + 1} di {totalSteps}</span>
            <span>{Math.round(((step + 1) / totalSteps) * 100)}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-orange rounded-full"
              animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl"
            >
              <h2 className="text-lg font-bold text-white mb-5">
                {currentStepData.title}
              </h2>

              <div className="max-h-[55vh] overflow-y-auto pr-1 space-y-1">
                {currentStepData.content}
              </div>

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-700">
                {step > 0 ? (
                  <button
                    onClick={() => go(-1)}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Indietro
                  </button>
                ) : (
                  <div />
                )}

                {step < totalSteps - 1 ? (
                  <button
                    onClick={() => go(1)}
                    disabled={!currentStepData.canProceed}
                    className="px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200
                      bg-orange text-white hover:bg-orange/90
                      disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Avanti →
                  </button>
                ) : (
                  <button
                    onClick={handleGenerate}
                    disabled={!currentStepData.canProceed || isGenerating}
                    className="px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200
                      bg-green-600 hover:bg-green-500 text-white
                      disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? '⏳ Generazione...' : '📊 Genera Report'}
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default AdminSurvey;
