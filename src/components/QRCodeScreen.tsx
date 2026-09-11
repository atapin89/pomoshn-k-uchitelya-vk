import { useState, useRef, useEffect } from 'react';
import {
  QrCode,
  Download,
  Wifi,
  Link,
  FileText,
  Mail,
  User,
  Phone,
  Palette,
  RotateCcw,
  Copy,
  Check,
  BookOpen,
} from 'lucide-react';
import QRCode from 'qrcode';
import BackButton from './BackButton';

type QRType = 'text' | 'url' | 'wifi' | 'email' | 'phone' | 'vcard';

interface QROptions {
  type: QRType;
  text: string;
  url: string;
  wifiSSID: string;
  wifiPassword: string;
  wifiEncryption: 'WPA' | 'WEP' | 'nopass';
  wifiHidden: boolean;
  emailTo: string;
  emailSubject: string;
  emailBody: string;
  phoneNumber: string;
  vcardName: string;
  vcardPhone: string;
  vcardEmail: string;
  vcardOrg: string;
  foregroundColor: string;
  backgroundColor: string;
  size: number;
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
}

const DEFAULT_OPTIONS: QROptions = {
  type: 'text',
  text: '',
  url: 'https://',
  wifiSSID: '',
  wifiPassword: '',
  wifiEncryption: 'WPA',
  wifiHidden: false,
  emailTo: '',
  emailSubject: '',
  emailBody: '',
  phoneNumber: '',
  vcardName: '',
  vcardPhone: '',
  vcardEmail: '',
  vcardOrg: '',
  foregroundColor: '#000000',
  backgroundColor: '#ffffff',
  size: 300,
  errorCorrection: 'M',
};

const QR_TYPES: { type: QRType; label: string; icon: React.ReactNode; description: string }[] = [
  { type: 'text', label: 'Текст', icon: <FileText className="w-4 h-4" />, description: 'Произвольный текст' },
  { type: 'url', label: 'URL', icon: <Link className="w-4 h-4" />, description: 'Ссылка на сайт' },
  { type: 'wifi', label: 'WiFi', icon: <Wifi className="w-4 h-4" />, description: 'Подключение к сети' },
  { type: 'email', label: 'Email', icon: <Mail className="w-4 h-4" />, description: 'Отправка письма' },
  { type: 'phone', label: 'Телефон', icon: <Phone className="w-4 h-4" />, description: 'Звонок по номеру' },
  { type: 'vcard', label: 'Визитка', icon: <User className="w-4 h-4" />, description: 'Контакт vCard' },
];

export default function QRCodeScreen({ onBack }: { onBack: () => void }) {
  const [options, setOptions] = useState<QROptions>(DEFAULT_OPTIONS);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateQRContent = (): string => {
    switch (options.type) {
      case 'text':
        return options.text;
      case 'url':
        return options.url.startsWith('http') ? options.url : `https://${options.url}`;
      case 'wifi':
        return `WIFI:T:${options.wifiEncryption};S:${options.wifiSSID};P:${options.wifiPassword};H:${options.wifiHidden ? 'true' : 'false'};;`;
      case 'email':
        return `mailto:${options.emailTo}?subject=${encodeURIComponent(options.emailSubject)}&body=${encodeURIComponent(options.emailBody)}`;
      case 'phone':
        return `tel:${options.phoneNumber}`;
      case 'vcard':
        return `BEGIN:VCARD\nVERSION:3.0\nFN:${options.vcardName}\nTEL:${options.vcardPhone}\nEMAIL:${options.vcardEmail}\nORG:${options.vcardOrg}\nEND:VCARD`;
      default:
        return '';
    }
  };

  useEffect(() => {
    const generateQR = async () => {
      const content = generateQRContent();
      if (!content || content.length < 2) {
        setQrDataUrl('');
        return;
      }

      setIsGenerating(true);
      try {
        const canvas = canvasRef.current;
        if (!canvas) return;

        await QRCode.toCanvas(canvas, content, {
          width: options.size,
          margin: 2,
          color: {
            dark: options.foregroundColor,
            light: options.backgroundColor,
          },
          errorCorrectionLevel: options.errorCorrection,
        });

        const dataUrl = canvas.toDataURL('image/png');
        setQrDataUrl(dataUrl);
      } catch (error) {
        console.error('QR generation error:', error);
      } finally {
        setIsGenerating(false);
      }
    };

    generateQR();
  }, [options]);

  const handleDownload = (format: 'png' | 'svg') => {
    const content = generateQRContent();
    if (!content) return;

    if (format === 'png') {
      const link = document.createElement('a');
      link.download = `qr-code-${options.type}-${Date.now()}.png`;
      link.href = qrDataUrl;
      link.click();
    } else {
      QRCode.toString(content, {
        type: 'svg',
        width: options.size,
        margin: 2,
        color: {
          dark: options.foregroundColor,
          light: options.backgroundColor,
        },
        errorCorrectionLevel: options.errorCorrection,
      }).then((svg) => {
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `qr-code-${options.type}-${Date.now()}.svg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      });
    }
  };

  const handleCopyContent = () => {
    const content = generateQRContent();
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setOptions(DEFAULT_OPTIONS);
  };

  const isValid = (): boolean => {
    const content = generateQRContent();
    return content.length >= 2;
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-purple-50 to-indigo-50 flex flex-col">
      <header className="bg-purple-700 shadow-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Генератор QR-кодов</h1>
            <p className="text-xs text-purple-200">Создание кодов для любых задач</p>
          </div>
          <div className="shrink-0 w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
            <QrCode className="w-5 h-5 text-white" />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-3 space-y-3 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3">
          {/* Левая колонка: настройки */}
          <div className="space-y-3">
            {/* Тип QR-кода */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="text-lg font-bold text-purple-700 mb-3">Тип QR-кода</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {QR_TYPES.map((qt) => (
                  <button
                    key={qt.type}
                    onClick={() => setOptions(prev => ({ ...prev, type: qt.type }))}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      options.type === qt.type
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`${options.type === qt.type ? 'text-purple-600' : 'text-gray-500'}`}>
                        {qt.icon}
                      </div>
                      <span className={`text-sm font-semibold ${options.type === qt.type ? 'text-purple-700' : 'text-gray-700'}`}>
                        {qt.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 text-left">{qt.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Поля ввода в зависимости от типа */}
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <h2 className="text-lg font-bold text-purple-700 mb-3">Содержимое</h2>

              {options.type === 'text' && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">Текст</label>
                  <textarea
                    value={options.text}
                    onChange={(e) => setOptions(prev => ({ ...prev, text: e.target.value }))}
                    placeholder="Введите текст для QR-кода"
                    rows={4}
                    className="w-full rounded-xl border-2 border-purple-200 bg-purple-50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                  />
                </div>
              )}

              {options.type === 'url' && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">URL-адрес</label>
                  <input
                    type="url"
                    value={options.url}
                    onChange={(e) => setOptions(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://example.com"
                    className="w-full rounded-xl border-2 border-purple-200 bg-purple-50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                  />
                </div>
              )}

              {options.type === 'wifi' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1 block">Название сети (SSID)</label>
                    <input
                      type="text"
                      value={options.wifiSSID}
                      onChange={(e) => setOptions(prev => ({ ...prev, wifiSSID: e.target.value }))}
                      placeholder="MyWiFiNetwork"
                      className="w-full rounded-xl border-2 border-purple-200 bg-purple-50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1 block">Пароль</label>
                    <input
                      type="text"
                      value={options.wifiPassword}
                      onChange={(e) => setOptions(prev => ({ ...prev, wifiPassword: e.target.value }))}
                      placeholder="password123"
                      className="w-full rounded-xl border-2 border-purple-200 bg-purple-50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1 block">Тип шифрования</label>
                    <select
                      value={options.wifiEncryption}
                      onChange={(e) => setOptions(prev => ({ ...prev, wifiEncryption: e.target.value as any }))}
                      className="w-full rounded-xl border-2 border-purple-200 bg-purple-50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                    >
                      <option value="WPA">WPA/WPA2 (рекомендуется)</option>
                      <option value="WEP">WEP (устаревший)</option>
                      <option value="nopass">Без пароля</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-purple-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={options.wifiHidden}
                      onChange={(e) => setOptions(prev => ({ ...prev, wifiHidden: e.target.checked }))}
                      className="w-4 h-4 accent-purple-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Скрытая сеть</span>
                  </label>
                </div>
              )}

              {options.type === 'email' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1 block">Email получателя</label>
                    <input
                      type="email"
                      value={options.emailTo}
                      onChange={(e) => setOptions(prev => ({ ...prev, emailTo: e.target.value }))}
                      placeholder="example@mail.com"
                      className="w-full rounded-xl border-2 border-purple-200 bg-purple-50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1 block">Тема письма</label>
                    <input
                      type="text"
                      value={options.emailSubject}
                      onChange={(e) => setOptions(prev => ({ ...prev, emailSubject: e.target.value }))}
                      placeholder="Тема письма"
                      className="w-full rounded-xl border-2 border-purple-200 bg-purple-50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1 block">Текст письма</label>
                    <textarea
                      value={options.emailBody}
                      onChange={(e) => setOptions(prev => ({ ...prev, emailBody: e.target.value }))}
                      placeholder="Текст письма"
                      rows={3}
                      className="w-full rounded-xl border-2 border-purple-200 bg-purple-50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                    />
                  </div>
                </div>
              )}

              {options.type === 'phone' && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">Номер телефона</label>
                  <input
                    type="tel"
                    value={options.phoneNumber}
                    onChange={(e) => setOptions(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    placeholder="+7 (999) 123-45-67"
                    className="w-full rounded-xl border-2 border-purple-200 bg-purple-50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                  />
                </div>
              )}

              {options.type === 'vcard' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1 block">Имя</label>
                    <input
                      type="text"
                      value={options.vcardName}
                      onChange={(e) => setOptions(prev => ({ ...prev, vcardName: e.target.value }))}
                      placeholder="Иванов Иван Иванович"
                      className="w-full rounded-xl border-2 border-purple-200 bg-purple-50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1 block">Телефон</label>
                    <input
                      type="tel"
                      value={options.vcardPhone}
                      onChange={(e) => setOptions(prev => ({ ...prev, vcardPhone: e.target.value }))}
                      placeholder="+7 (999) 123-45-67"
                      className="w-full rounded-xl border-2 border-purple-200 bg-purple-50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1 block">Email</label>
                    <input
                      type="email"
                      value={options.vcardEmail}
                      onChange={(e) => setOptions(prev => ({ ...prev, vcardEmail: e.target.value }))}
                      placeholder="ivan@example.com"
                      className="w-full rounded-xl border-2 border-purple-200 bg-purple-50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1 block">Организация</label>
                    <input
                      type="text"
                      value={options.vcardOrg}
                      onChange={(e) => setOptions(prev => ({ ...prev, vcardOrg: e.target.value }))}
                      placeholder="ООО Ромашка"
                      className="w-full rounded-xl border-2 border-purple-200 bg-purple-50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleCopyContent}
                disabled={!isValid()}
                className="w-full py-2.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Скопировано!' : 'Копировать содержимое'}
              </button>
            </div>

            {/* Настройки дизайна */}
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-purple-700 flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Дизайн
                </h2>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Сброс
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">Цвет кода</label>
                  <input
                    type="color"
                    value={options.foregroundColor}
                    onChange={(e) => setOptions(prev => ({ ...prev, foregroundColor: e.target.value }))}
                    className="w-full h-12 rounded-xl border-2 border-purple-200 cursor-pointer p-1 bg-purple-50"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">Цвет фона</label>
                  <input
                    type="color"
                    value={options.backgroundColor}
                    onChange={(e) => setOptions(prev => ({ ...prev, backgroundColor: e.target.value }))}
                    className="w-full h-12 rounded-xl border-2 border-purple-200 cursor-pointer p-1 bg-purple-50"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm font-semibold text-gray-700">Размер</label>
                  <span className="text-sm font-bold text-purple-600 tabular-nums">{options.size}px</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={800}
                  step={50}
                  value={options.size}
                  onChange={(e) => setOptions(prev => ({ ...prev, size: Number(e.target.value) }))}
                  className="w-full accent-purple-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>100px</span>
                  <span>800px</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Коррекция ошибок</label>
                <select
                  value={options.errorCorrection}
                  onChange={(e) => setOptions(prev => ({ ...prev, errorCorrection: e.target.value as any }))}
                  className="w-full rounded-xl border-2 border-purple-200 bg-purple-50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                >
                  <option value="L">Низкая (7%) — больше данных</option>
                  <option value="M">Средняя (15%) — баланс</option>
                  <option value="Q">Высокая (25%) — устойчивость</option>
                  <option value="H">Максимальная (30%) — для логотипов</option>
                </select>
              </div>
            </div>
          </div>

          {/* Правая колонка: предпросмотр и скачивание */}
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="text-lg font-bold text-purple-700 mb-3">Предпросмотр</h2>
              <div className="flex justify-center">
                <div className="relative w-full max-w-[300px] aspect-square bg-gray-50 rounded-2xl border-2 border-purple-100 overflow-hidden flex items-center justify-center">
                  <canvas
                    ref={canvasRef}
                    className="rounded-xl"
                    style={{ width: '100%', maxWidth: '300px', height: 'auto' }}
                  />
                  {isGenerating && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    </div>
                  )}
                  {!isValid() && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-xl">
                      <p className="text-gray-500 text-sm">Заполните поля</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
              <h3 className="text-sm font-bold text-purple-700 mb-2">Скачать</h3>
              <button
                onClick={() => handleDownload('png')}
                disabled={!isValid()}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-md transition-colors"
              >
                <Download className="w-4 h-4" />
                PNG (растр)
              </button>
              <button
                onClick={() => handleDownload('svg')}
                disabled={!isValid()}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-md transition-colors"
              >
                <Download className="w-4 h-4" />
                SVG (вектор)
              </button>
            </div>

            <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-3 text-[11px] text-purple-900">
              <b>💡 Совет:</b> Для печати используйте SVG (вектор) — он масштабируется без потери качества. Для веба и соцсетей подойдёт PNG.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
