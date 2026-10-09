import React, { useState } from 'react';
import { AppConfig, TelegramConfig } from '../../types/helix';
import { Send, CheckCircle, AlertTriangle, Loader2, HelpCircle } from 'lucide-react';
import { helixApi } from '../../services/api';

interface TelegramViewProps {
  config: AppConfig | null;
  onUpdateConfig: (cfg: Partial<AppConfig>) => void;
}

export const TelegramView: React.FC<TelegramViewProps> = ({ config, onUpdateConfig }) => {
  const tg = config?.telegram;
  const [token, setToken] = useState(tg?.bot_token || '');
  const [chatId, setChatId] = useState(tg?.chat_id || '');
  const [enabled, setEnabled] = useState(tg?.enabled || false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      await helixApi.updateTelegramConfig({
        bot_token: token,
        chat_id: chatId,
        enabled
      });
      onUpdateConfig({
        telegram: {
          ...(tg as any),
          bot_token: token,
          chat_id: chatId,
          enabled
        }
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (e: any) {
      setTestResult({ ok: false, msg: e?.message || 'Fehler beim Speichern' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!token || !chatId) {
      setTestResult({ ok: false, msg: 'Bitte Bot Token und Chat ID eintragen' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await helixApi.testTelegram(token, chatId);
      setTestResult({ ok: res.ok, msg: res.message || (res as any).error || 'Test erfolgreich' });
    } catch (e: any) {
      setTestResult({ ok: false, msg: e?.message || 'Fehler beim Senden' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto font-mono text-xs overflow-y-auto">
      <div className="bg-[#081113] border border-[#132427] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#00e5ff]/15 border border-[#00e5ff]/30 flex items-center justify-center text-[#00e5ff]">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#ecf9f6]">TELEGRAM PUSH ALERTS</h2>
            <p className="text-xs text-[#7e9994] mt-0.5">
              Sofortige Benachrichtigungen für Buy-Fills, Take-Profits, Stop-Loss und Rug-Warnungen
            </p>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[#050b0d] border border-[#132427] space-y-4">
          <div className="flex items-center justify-between p-3 rounded bg-[#081113] border border-[#132427]">
            <div>
              <span className="text-[#ecf9f6] font-bold block">Push-Benachrichtigungen aktivieren</span>
              <span className="text-[10px] text-[#7e9994]">Erforderlich, damit Trades & Signale an Telegram gesendet werden</span>
            </div>
            <input
              type="checkbox"
              checked={enabled}
              onChange={e => setEnabled(e.target.checked)}
              className="w-4 h-4 accent-[#00ffa3] rounded cursor-pointer"
            />
          </div>

          <div>
            <label className="text-[10px] text-[#7e9994] block mb-1">Telegram Bot Token (von @BotFather)</label>
            <input
              type="password"
              placeholder="z.B. 123456789:ABCdefGHIjklMNOpqr..."
              value={token}
              onChange={e => setToken(e.target.value)}
              className="w-full bg-[#081113] border border-[#132427] rounded px-3 py-2 text-xs text-[#ecf9f6] outline-none focus:border-[#00ffa3]"
            />
          </div>

          <div>
            <label className="text-[10px] text-[#7e9994] block mb-1">Chat ID / Channel ID (z.B. via @userinfobot)</label>
            <input
              type="text"
              placeholder="z.B. 987654321 oder @dein_channel"
              value={chatId}
              onChange={e => setChatId(e.target.value)}
              className="w-full bg-[#081113] border border-[#132427] rounded px-3 py-2 text-xs text-[#ecf9f6] outline-none focus:border-[#00ffa3]"
            />
          </div>

          {testResult && (
            <div
              className={`p-3 rounded text-xs flex items-center space-x-2 ${
                testResult.ok
                  ? 'bg-[#00ffa3]/15 text-[#00ffa3] border border-[#00ffa3]/30'
                  : 'bg-[#ff3b69]/15 text-[#ff3b69] border border-[#ff3b69]/30'
              }`}
            >
              {testResult.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{testResult.msg}</span>
            </div>
          )}

          {savedSuccess && (
            <div className="p-3 rounded text-xs bg-[#00ffa3]/15 text-[#00ffa3] border border-[#00ffa3]/30 flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>Telegram-Konfiguration erfolgreich gespeichert!</span>
            </div>
          )}

          <div className="flex space-x-3 pt-2">
            <button
              onClick={handleTest}
              disabled={testing}
              className="flex-1 py-2.5 rounded bg-[#081113] hover:bg-[#0c1a1d] border border-[#132427] text-[#ecf9f6] font-bold transition flex items-center justify-center space-x-1.5"
            >
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>TEST-NACHRICHT SENDEN</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 rounded bg-[#00ffa3] text-[#030708] font-bold hover:brightness-110 transition flex items-center justify-center space-x-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>KONFIGURATION SPEICHERN</span>
            </button>
          </div>

          <div className="p-3 rounded bg-[#030708] border border-[#132427] text-[11px] text-[#7e9994] space-y-1.5">
            <div className="flex items-center space-x-1.5 text-[#ecf9f6] font-bold">
              <HelpCircle className="w-3.5 h-3.5 text-[#00e5ff]" />
              <span>Wichtige Hinweise & Checkliste bei Problemen:</span>
            </div>
            <ul className="list-disc pl-4 space-y-1">
              <li><b>1. Bot erstellt?</b> Erstelle einen Bot über <code className="text-[#00e5ff]">@BotFather</code> auf Telegram und kopiere das Bot Token.</li>
              <li><b>2. Chat gestartet?</b> Du musst deinen Bot einmal auf Telegram öffnen und den <code className="text-[#00e5ff]">/start</code> Befehl senden, da Telegram sonst aus Datenschutzgründen keine Nachrichten an deinen Account sendet.</li>
              <li><b>3. Chat ID ermitteln?</b> Nutze z.B. <code className="text-[#00e5ff]">@userinfobot</code> um deine persönliche numerische Chat-ID herauszufinden.</li>
              <li><b>4. Aktiviert & Gespeichert?</b> Stelle sicher, dass der Schalter oben aktiviert ist und du auf <b>KONFIGURATION SPEICHERN</b> geklickt hast.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
