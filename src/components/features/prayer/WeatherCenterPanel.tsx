import React, { useState } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import type { GlobalWeatherResponse } from '../../../services/globalWeatherService';
import {
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Wind,
  Droplets,
  Gauge,
  Eye,
  Sunrise,
  Sunset,
  RefreshCw,
  AlertTriangle,
  Thermometer,
  CalendarDays,
  Clock,
} from 'lucide-react';

interface WeatherCenterPanelProps {
  weather: GlobalWeatherResponse | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  mode: 'compact' | 'forecast';
}

function renderWeatherIcon(icon: string, className = 'w-6 h-6') {
  switch (icon) {
    case 'sun':
      return <Sun className={`${className} text-amber-400`} />;
    case 'rain':
    case 'drizzle':
      return <CloudRain className={`${className} text-sky-400`} />;
    case 'snow':
      return <CloudSnow className={`${className} text-cyan-200`} />;
    case 'storm':
      return <CloudLightning className={`${className} text-yellow-300`} />;
    case 'fog':
      return <CloudFog className={`${className} text-slate-300`} />;
    case 'partly_cloudy':
      return <Cloud className={`${className} text-amber-200`} />;
    default:
      return <Cloud className={`${className} text-sky-300`} />;
  }
}

function getCacheAgeMinutes(fetchedAt: string): number {
  const ts = Date.parse(fetchedAt);
  if (!Number.isFinite(ts)) return 0;
  return Math.max(0, Math.round((Date.now() - ts) / 60000));
}

export const WeatherCenterPanel: React.FC<WeatherCenterPanelProps> = ({
  weather,
  isLoading,
  error,
  onRefresh,
  mode,
}) => {
  const [forecastRange, setForecastRange] = useState<'7d' | '16d'>('7d');

  if (mode === 'compact') {
    return (
      <div className="rounded-2xl border border-sky-400/25 bg-gradient-to-br from-[#081C26]/95 via-[#0B2432]/92 to-[#071822]/95 text-sky-50 p-5 space-y-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300 flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5" />
              <span>Ob-havo Markazi</span>
              {weather?.isStale && (
                <span className="text-amber-300 ml-1">· ESKI KESH</span>
              )}
            </div>
            <div className="text-sm font-bold text-white mt-0.5 truncate">
              {weather?.locationLabel || 'Ob-havo yuklanmoqda...'}
            </div>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            title="Ob-havoni yangilash"
            className="p-2 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] border border-white/[0.12] text-sky-200 cursor-pointer transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {weather?.isStale && weather.staleNotice && (
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-[11px] text-amber-100 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
            <span>{weather.staleNotice}</span>
          </div>
        )}

        {!weather && !isLoading && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-400/35 text-xs text-rose-100 flex items-center justify-between gap-2">
            <span>{error || 'Jonli ob-havo olinmadi. Qayta urinib ko‘ring.'}</span>
            <Button variant="outline" size="sm" onClick={onRefresh} className="text-[11px]">
              Qayta
            </Button>
          </div>
        )}

        {weather && (
          <>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-sky-400/15 border border-sky-300/25 flex items-center justify-center shrink-0">
                  {renderWeatherIcon(weather.current.conditionIcon, 'w-8 h-8')}
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-extrabold az-type-numeric text-white leading-none">
                    {Math.round(weather.current.temperatureC)}°C
                  </div>
                  <div className="text-xs text-sky-200 font-medium mt-1">
                    {weather.current.conditionUz}
                  </div>
                </div>
              </div>

              <div className="text-right text-xs space-y-1 text-sky-200/90">
                <div className="flex items-center justify-end gap-1">
                  <Thermometer className="w-3.5 h-3.5 text-sky-300" />
                  <span>His: {Math.round(weather.current.apparentTemperatureC)}°C</span>
                </div>
                <div className="text-[11px] font-mono-numbers text-sky-300/80">
                  UV: {weather.current.uvIndex ?? '—'} · Yog‘in: {weather.current.precipitationProbabilityPct ?? 0}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-white/10 text-[11px]">
              <div className="p-2 rounded-xl bg-white/[0.05] border border-white/[0.08]">
                <div className="text-sky-300/80 flex items-center gap-1">
                  <Droplets className="w-3 h-3" />
                  <span>Namlik</span>
                </div>
                <div className="font-bold az-type-numeric text-white mt-0.5">
                  {weather.current.humidityPct}%
                </div>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.05] border border-white/[0.08]">
                <div className="text-sky-300/80 flex items-center gap-1">
                  <Wind className="w-3 h-3" />
                  <span>Shamol</span>
                </div>
                <div className="font-bold az-type-numeric text-white mt-0.5">
                  {weather.current.windSpeedKmh} km/s {weather.current.windDirectionLabel}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.05] border border-white/[0.08]">
                <div className="text-sky-300/80 flex items-center gap-1">
                  <Gauge className="w-3 h-3" />
                  <span>Bosim</span>
                </div>
                <div className="font-bold az-type-numeric text-white mt-0.5">
                  {weather.current.surfacePressureHpa} hPa
                </div>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.05] border border-white/[0.08]">
                <div className="text-sky-300/80 flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>Ko‘rinish</span>
                </div>
                <div className="font-bold az-type-numeric text-white mt-0.5">
                  {weather.current.visibilityKm !== null ? `${weather.current.visibilityKm} km` : '—'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-sky-300/80 pt-1">
              <div className="flex items-center gap-3 font-mono-numbers">
                <span className="inline-flex items-center gap-1">
                  <Sunrise className="w-3 h-3 text-amber-300" />
                  {weather.current.sunrise || '--:--'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Sunset className="w-3 h-3 text-orange-300" />
                  {weather.current.sunset || '--:--'}
                </span>
              </div>
              <div>
                {weather.attribution} ·{' '}
                {weather.isStale
                  ? `Eski: ${weather.fetchedAt.slice(0, 16).replace('T', ' ')} UTC`
                  : weather.cacheHit
                    ? `Kesh (${getCacheAgeMinutes(weather.fetchedAt)} daq)`
                    : 'Jonli'}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // BOTTOM SECTION: FULL 24-HOUR HOURLY + 7-DAY / 16-DAY FORECAST CENTER
  const dailySlice = weather
    ? forecastRange === '7d'
      ? weather.daily7
      : weather.daily16
    : [];

  return (
    <Card
      elevated
      className="p-6 sm:p-7 space-y-6 border-sky-500/25 bg-gradient-to-b from-slate-50/95 to-sky-50/60 dark:from-[#071620] dark:to-[#091D29]"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-900/10 dark:border-sky-300/15 pb-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4" />
            <span>Global Ob-havo Prognozi (Namoz jadvalidan alohida blok)</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-sky-50 mt-0.5">
            {weather?.locationLabel || 'Ob-havo prognozi'} — 24 soatlik va {forecastRange === '7d' ? '7' : '16'} kunlik
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 rounded-xl bg-sky-900/10 dark:bg-black/35 border border-sky-900/10 dark:border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setForecastRange('7d')}
              className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${
                forecastRange === '7d'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-600 dark:text-sky-200/80 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              7 kunlik
            </button>
            <button
              type="button"
              onClick={() => setForecastRange('16d')}
              className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${
                forecastRange === '16d'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-600 dark:text-sky-200/80 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              16 kunlik
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading} className="text-xs gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Yangilash</span>
          </Button>
        </div>
      </div>

      {weather?.isStale && weather.staleNotice && (
        <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs text-amber-900 dark:text-amber-100 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span>{weather.staleNotice}</span>
        </div>
      )}

      {!weather ? (
        <div className="py-10 text-center text-sm text-slate-600 dark:text-sky-200/80">
          {isLoading ? 'Open-Meteo orqali ob-havo yuklanmoqda...' : error || 'Ob-havo ma’lumoti mavjud emas.'}
        </div>
      ) : (
        <>
          {/* 24-Hour Horizontal Hourly Strip */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold text-slate-700 dark:text-sky-200 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-500" />
              <span>24 soatlik prognoz</span>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-2">
              {weather.hourly24.map((h) => (
                <div
                  key={h.timeLocal}
                  className="min-w-[82px] p-3 rounded-2xl border border-sky-900/10 dark:border-sky-300/15 bg-white/80 dark:bg-[#0B2230]/80 text-center space-y-1.5 shrink-0"
                >
                  <div className="text-[11px] font-mono-numbers font-bold text-slate-600 dark:text-sky-300">
                    {h.hourLabel}
                  </div>
                  <div className="flex justify-center">{renderWeatherIcon(h.conditionIcon, 'w-5 h-5')}</div>
                  <div className="text-sm font-extrabold az-type-numeric text-slate-900 dark:text-white">
                    {Math.round(h.temperatureC)}°
                  </div>
                  <div className="text-[10px] text-sky-700 dark:text-sky-300 font-mono-numbers">
                    {h.precipitationProbabilityPct}% · {Math.round(h.windSpeedKmh)}km/s
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 7-Day / 16-Day Daily Forecast Grid */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold text-slate-700 dark:text-sky-200">
              {forecastRange === '7d' ? '7 kunlik prognoz' : '16 kunlik kengaytirilgan prognoz'}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {dailySlice.map((d, idx) => (
                <div
                  key={d.date}
                  className="p-3.5 rounded-2xl border border-sky-900/10 dark:border-sky-300/15 bg-white/85 dark:bg-[#0B2230]/80 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
                      {renderWeatherIcon(d.conditionIcon, 'w-5 h-5')}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {idx === 0 ? 'Bugun' : idx === 1 ? 'Ertaga' : d.date}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-sky-200/80 truncate">
                        {d.conditionUz}
                      </div>
                      <div className="text-[10px] text-sky-700 dark:text-sky-300 font-mono-numbers">
                        Yog‘in: {d.precipitationProbabilityMaxPct}% · Shamol: {d.windSpeedMaxKmh} km/s
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 az-type-numeric">
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {Math.round(d.tempMaxC)}°
                    </div>
                    <div className="text-xs text-slate-500 dark:text-sky-300/75">
                      {Math.round(d.tempMinC)}°
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-sky-900/10 dark:border-sky-300/15 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-sky-300/80">
            <span>
              {weather.attribution} · {weather.freeTierNotice}
            </span>
            <span className="font-mono-numbers">
              Vaqt zonasi: {weather.timezone} · Yangilangan: {weather.fetchedAt.slice(0, 19).replace('T', ' ')} UTC
            </span>
          </div>
        </>
      )}
    </Card>
  );
};
